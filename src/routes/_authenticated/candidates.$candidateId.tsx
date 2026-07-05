import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Award,
  Briefcase,
  GraduationCap,
  FolderKanban,
  Star,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/candidates/$candidateId")({
  head: () => ({ meta: [{ title: "Candidate — TalentLens" }] }),
  component: CandidateDetail,
});

function CandidateDetail() {
  const { candidateId } = Route.useParams();
  const qc = useQueryClient();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("candidates")
        .update({ status })
        .eq("id", candidateId);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      toast.success(`Marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !candidate) {
    return (
      <div className="min-h-screen gradient-mesh-bg">
        <SiteNav variant="app" />
        <div className="mx-auto max-w-6xl p-10">
          <div className="h-64 animate-pulse rounded-2xl bg-card" />
        </div>
      </div>
    );
  }

  const score = Number(candidate.match_score);
  const tone = score >= 80 ? "success" : score >= 60 ? "primary" : "destructive";
  const label = score >= 80 ? "Excellent match" : score >= 60 ? "Good match" : "Low match";

  const radarData = [
    { key: "Skills", v: Number(candidate.skill_match) },
    { key: "Experience", v: Number(candidate.experience_match) },
    { key: "Education", v: Number(candidate.education_match) },
    { key: "Keywords", v: Number(candidate.keyword_match) },
  ];

  return (
    <div className="min-h-screen gradient-mesh-bg">
      <SiteNav variant="app" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/jobs/$jobId"
          params={{ jobId: candidate.job_id }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to ranking
        </Link>

        {/* Header card */}
        <div className="glass-panel rounded-2xl p-6 shadow-elegant">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight">
                {candidate.name ?? "Unnamed candidate"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {candidate.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {candidate.email}
                  </span>
                )}
                {candidate.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {candidate.phone}
                  </span>
                )}
                {candidate.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {candidate.location}
                  </span>
                )}
              </div>
              {candidate.summary && (
                <p className="mt-4 max-w-2xl text-sm text-foreground/80">{candidate.summary}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate("shortlisted")}
                  className="gradient-primary-bg"
                >
                  Shortlist
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate("rejected")}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateStatus.mutate("new")}
                >
                  Reset
                </Button>
                <span className="ml-auto self-center rounded-full bg-muted px-3 py-1 text-xs capitalize">
                  {candidate.status}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <ScoreRing score={score} tone={tone} />
              <p className="mt-2 text-sm font-medium">{label}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Match analysis */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft lg:col-span-2">
            <h2 className="text-lg font-semibold">Match analysis</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis dataKey="key" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="v"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {radarData.map((r) => (
                  <div key={r.key}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{r.key}</span>
                      <span className="font-semibold">{r.v}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full gradient-primary-bg" style={{ width: `${r.v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {candidate.recommendation && (
              <div className="mt-6 rounded-xl bg-primary/5 border border-primary/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  AI recommendation
                </p>
                <p className="mt-1.5 text-sm text-foreground/90">{candidate.recommendation}</p>
              </div>
            )}
          </div>

          {/* Strengths & gaps */}
          <div className="space-y-6">
            <ListCard
              title="Strengths"
              icon={Star}
              tone="success"
              items={candidate.strengths ?? []}
            />
            <ListCard
              title="Gaps"
              icon={ThumbsDown}
              tone="destructive"
              items={candidate.weaknesses ?? []}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Skills */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Skills</h2>
            {!!candidate.matched_skills?.length && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-success">
                  Matched
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {candidate.matched_skills.map((s: string) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!!candidate.missing_skills?.length && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                  Missing
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {candidate.missing_skills.map((s: string) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                All extracted skills
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(candidate.skills ?? []).map((s: string) => (
                  <span
                    key={s}
                    className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Experience & education */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Briefcase className="h-4 w-4 text-primary" />
                Experience
              </h2>
              <p className="mt-2 text-sm">
                <span className="font-semibold">
                  {candidate.experience_years ? `${Number(candidate.experience_years)} years` : "—"}
                </span>{" "}
                <span className="text-muted-foreground">total</span>
              </p>
              {!!candidate.companies?.length && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {candidate.companies.map((c: string) => (
                    <li key={c} className="text-muted-foreground">
                      • {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <GraduationCap className="h-4 w-4 text-primary" />
                Education
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(candidate.education ?? []).map((e: any, i: number) => (
                  <li key={i}>
                    <p className="font-medium">{e.degree ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[e.institution, e.year].filter(Boolean).join(" • ")}
                    </p>
                  </li>
                ))}
                {(candidate.education ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">No education found.</li>
                )}
              </ul>
            </div>

            {!!candidate.certifications?.length && (
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Award className="h-4 w-4 text-primary" />
                  Certifications
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {candidate.certifications.map((c: string) => (
                    <span
                      key={c}
                      className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!!candidate.projects?.length && (
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  Projects
                </h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {candidate.projects.map((p: any, i: number) => (
                    <li key={i}>
                      <p className="font-medium">{p.name ?? "Project"}</p>
                      <p className="text-xs text-muted-foreground">{p.description ?? ""}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ScoreRing({ score, tone }: { score: number; tone: "success" | "primary" | "destructive" }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const colorVar =
    tone === "success" ? "var(--color-success)" : tone === "destructive" ? "var(--color-destructive)" : "var(--color-primary)";
  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="var(--color-muted)" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={colorVar}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight">{score}%</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">match</span>
      </div>
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: any;
  tone: "success" | "destructive";
  items: string[];
}) {
  const toneClasses =
    tone === "success"
      ? "bg-success/10 text-success"
      : "bg-destructive/10 text-destructive";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
        <span className={`grid h-6 w-6 place-items-center rounded-md ${toneClasses}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.length === 0 && <li className="text-muted-foreground">—</li>}
        {items.map((s, i) => (
          <li key={i} className="text-foreground/85">
            • {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
