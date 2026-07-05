import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const AnalyzeInput = z.object({
  jobId: z.string().uuid(),
  resumeText: z.string().min(30).max(50000),
});

const EducationItem = z.object({
  degree: z.string().nullable(),
  institution: z.string().nullable(),
  year: z.string().nullable(),
});
const ProjectItem = z.object({
  name: z.string().nullable(),
  description: z.string().nullable(),
});

const AnalysisSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string(),
  skills: z.array(z.string()),
  technical_skills: z.array(z.string()),
  soft_skills: z.array(z.string()),
  experience_years: z.number(),
  companies: z.array(z.string()),
  education: z.array(EducationItem),
  certifications: z.array(z.string()),
  projects: z.array(ProjectItem),
  match_score: z.number(),
  skill_match: z.number(),
  experience_match: z.number(),
  education_match: z.number(),
  keyword_match: z.number(),
  matched_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendation: z.string(),
});

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (jobErr || !job) throw new Error("Job not found");

    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway();

    const prompt = `You are an expert AI recruiter. Analyze the candidate resume against the job description.

# JOB
Title: ${job.title}
Description:
${job.description}
Required skills: ${(job.required_skills ?? []).join(", ") || "n/a"}
Preferred skills: ${(job.preferred_skills ?? []).join(", ") || "n/a"}
Keywords: ${(job.keywords ?? []).join(", ") || "n/a"}
Min experience (years): ${job.min_experience_years ?? "n/a"}

# RESUME
${data.resumeText}

Return a JSON object with these fields:
- name, email, phone, location (extract from resume, null if not present)
- summary: 2-3 sentence AI summary of the candidate
- skills: all skills as a flat array
- technical_skills: hard/technical skills only
- soft_skills: soft skills only
- experience_years: total years of professional experience (number)
- companies: previous companies
- education: array of {degree, institution, year}
- certifications: array of strings
- projects: array of {name, description}
- match_score, skill_match, experience_match, education_match, keyword_match: integers 0-100
- matched_skills: skills present in both resume and job requirements
- missing_skills: required skills missing from resume
- strengths: 3-5 candidate strengths for this role
- weaknesses: 2-4 gaps or concerns
- recommendation: one short paragraph hiring recommendation

Be objective. Base match_score on weighted average of skill/experience/education/keyword matches.`;

    let parsed: z.infer<typeof AnalysisSchema>;
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: AnalysisSchema }),
        prompt,
      });
      parsed = output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        try {
          const raw = err.text ?? "";
          const jsonStart = raw.indexOf("{");
          const jsonEnd = raw.lastIndexOf("}");
          const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : raw;
          parsed = AnalysisSchema.parse(JSON.parse(jsonStr));
        } catch {
          throw new Error("AI could not parse this resume. Try a cleaner text version.");
        }
      } else {
        const msg = err instanceof Error ? err.message : "AI request failed";
        if (msg.includes("429")) throw new Error("Rate limit reached. Please try again in a moment.");
        if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace settings.");
        throw new Error(msg);
      }
    }

    const insertPayload = {
      user_id: userId,
      job_id: data.jobId,
      resume_text: data.resumeText,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      summary: parsed.summary,
      skills: parsed.skills,
      technical_skills: parsed.technical_skills,
      soft_skills: parsed.soft_skills,
      experience_years: parsed.experience_years,
      companies: parsed.companies,
      education: parsed.education,
      certifications: parsed.certifications,
      projects: parsed.projects,
      match_score: clampScore(parsed.match_score),
      skill_match: clampScore(parsed.skill_match),
      experience_match: clampScore(parsed.experience_match),
      education_match: clampScore(parsed.education_match),
      keyword_match: clampScore(parsed.keyword_match),
      matched_skills: parsed.matched_skills,
      missing_skills: parsed.missing_skills,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      recommendation: parsed.recommendation,
      status: "new",
    };

    const { data: row, error: insErr } = await supabase
      .from("candidates")
      .insert(insertPayload)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { candidateId: row.id };
  });

const ExtractJdInput = z.object({ description: z.string().min(20).max(20000) });
const JdSchema = z.object({
  title: z.string(),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  keywords: z.array(z.string()),
  min_experience_years: z.number(),
});

export const extractJobDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ExtractJdInput.parse(data))
  .handler(async ({ data }) => {
    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway();
    const prompt = `Extract structured fields from the following job description. Return JSON with:
- title: role title
- required_skills: array of must-have skills
- preferred_skills: array of nice-to-have skills
- keywords: array of important keywords/technologies
- min_experience_years: minimum years of experience as a number (0 if not stated)

Job description:
${data.description}`;
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: JdSchema }),
        prompt,
      });
      return output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        return { title: "", required_skills: [], preferred_skills: [], keywords: [], min_experience_years: 0 };
      }
      throw err;
    }
  });
