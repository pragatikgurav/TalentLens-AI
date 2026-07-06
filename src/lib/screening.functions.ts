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

const FALLBACK_SKILLS = [
  "react",
  "typescript",
  "javascript",
  "node",
  "python",
  "sql",
  "postgres",
  "postgresql",
  "supabase",
  "tailwind",
  "css",
  "html",
  "aws",
  "docker",
  "kubernetes",
  "graphql",
  "redis",
  "nextjs",
  "vite",
  "testing",
  "jest",
  "playwright",
  "azure",
  "git",
  "figma",
  "api",
  "rest",
  "microservices",
  "mongodb",
  "firebase",
  "ui",
  "ux",
];

const FALLBACK_SOFT_SKILLS = ["leadership", "communication", "collaboration", "mentoring", "problem solving", "planning"];

function extractFallbackSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return Array.from(
    new Set(
      FALLBACK_SKILLS.filter((skill) => {
        const normalized = skill.toLowerCase();
        return lower.includes(normalized);
      }),
    ),
  );
}

function inferExperienceYears(text: string): number {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  if (match) return Math.min(15, Math.max(1, Number(match[1])));
  return 3;
}

function buildFallbackAnalysis(job: { title?: string; description?: string; required_skills?: string[]; preferred_skills?: string[]; keywords?: string[]; min_experience_years?: number | null }, resumeText: string) {
  const resumeLower = resumeText.toLowerCase();
  const skills = extractFallbackSkills(resumeText);
  const requiredSkills = (job.required_skills ?? []).map((skill) => skill.toLowerCase());
  const preferredSkills = (job.preferred_skills ?? []).map((skill) => skill.toLowerCase());
  const keywordSkills = (job.keywords ?? []).map((skill) => skill.toLowerCase());
  const allCriteria = [...requiredSkills, ...preferredSkills, ...keywordSkills];
  const matchedSkills = skills.filter((skill) => allCriteria.some((criterion) => criterion.includes(skill) || skill.includes(criterion)));

  const experienceYears = inferExperienceYears(resumeLower);
  const minExperience = Number(job.min_experience_years ?? 0) || 2;
  const experienceMatch = Math.max(20, Math.min(100, Math.round((experienceYears / Math.max(minExperience, 1)) * 100)));
  const skillMatch = allCriteria.length > 0 ? Math.max(30, Math.min(100, Math.round((matchedSkills.length / Math.max(allCriteria.length, 1)) * 100))) : 70;
  const educationMatch = /bachelor|master|phd|degree|university|college/i.test(resumeLower) ? 85 : 65;
  const keywordMatch = Math.max(25, Math.min(100, Math.round((matchedSkills.length / Math.max(allCriteria.length, 1)) * 100)));
  const matchScore = Math.round(skillMatch * 0.45 + experienceMatch * 0.25 + educationMatch * 0.15 + keywordMatch * 0.15);

  const softSkills = FALLBACK_SOFT_SKILLS.filter((skill) => resumeLower.includes(skill));
  const technicalSkills = skills.filter((skill) => !FALLBACK_SOFT_SKILLS.includes(skill));

  return AnalysisSchema.parse({
    name: null,
    email: null,
    phone: null,
    location: null,
    summary: `This candidate appears to be a strong fit for ${job.title ?? "the role"} based on the available resume text. The local fallback parser extracted key skills and experience signals without external AI services.`,
    skills,
    technical_skills: technicalSkills,
    soft_skills: softSkills,
    experience_years: experienceYears,
    companies: [],
    education: [],
    certifications: [],
    projects: [],
    match_score: matchScore,
    skill_match: skillMatch,
    experience_match: experienceMatch,
    education_match: educationMatch,
    keyword_match: keywordMatch,
    matched_skills: matchedSkills,
    missing_skills: allCriteria.filter((skill) => !matchedSkills.some((matched) => matched.includes(skill) || skill.includes(matched))),
    strengths: ["Resume content is available for review", "Relevant experience signals were detected", "Role fit appears plausible"],
    weaknesses: ["Detailed company history was not extracted", "Additional context may be needed for a final hiring decision"],
    recommendation: `This local fallback analysis suggests a reasonable starting point for ${job.title ?? "the role"}. Review the resume details directly to confirm fit.`,
  });
}

function buildFallbackJobDescription(description: string) {
  const cleaned = description.replace(/\s+/g, " ").trim();
  const titleMatch = cleaned.match(/(?:role|position|title)[:\-]\s*([^\.\n]+)/i);
  const title = titleMatch?.[1]?.trim() || cleaned.split(/\./)[0]?.slice(0, 80) || "Software Engineer";
  const lower = cleaned.toLowerCase();
  const requiredSkills = FALLBACK_SKILLS.filter((skill) => lower.includes(skill.toLowerCase())).slice(0, 8);
  const keywords = requiredSkills.slice(0, 6);
  const minExperience = /((?:\d+)\+?)\s*(?:years?|yrs?)/i.test(lower) ? Number(lower.match(/(\d+)\+?\s*(?:years?|yrs?)/i)?.[1] ?? 2) : 2;

  return JdSchema.parse({
    title,
    required_skills: requiredSkills,
    preferred_skills: [],
    keywords,
    min_experience_years: minExperience,
  });
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
    if (!gateway) {
      parsed = buildFallbackAnalysis(job, data.resumeText);
    } else {
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
            parsed = buildFallbackAnalysis(job, data.resumeText);
          }
        } else {
          const msg = err instanceof Error ? err.message : "AI request failed";
          if (msg.includes("429")) throw new Error("Rate limit reached. Please try again in a moment.");
          if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace settings.");
          parsed = buildFallbackAnalysis(job, data.resumeText);
        }
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
    if (!gateway) {
      return buildFallbackJobDescription(data.description);
    }

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
      return buildFallbackJobDescription(data.description);
    }
  });
