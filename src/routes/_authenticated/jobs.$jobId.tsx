import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Sparkles, Search, Trash2 } from "lucide-react";
import { analyzeResume } from "@/lib/screening.functions";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Job — TalentLens" }] }),
  component: JobDetail,
});

type Candidate = {
  id: string;
  name: string | null;
  email: string | null;
  match_score: number;
  experience_years: number | null;
  skills: string[];
  education: any;
  status: string;
  created_at: string;
};

function JobDetail() {
  const { jobId } = Route.useParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, name, email, match_score, experience_years, skills, education, status, created_at")
        .eq("job_id", jobId)
        .order("match_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q)),
    );
  }, [candidates, search]);

  const avg = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + Number(c.match_score), 0) / candidates.length)
    : 0;

  return (
    <div className="min-h-screen gradient-mesh-bg">
      <SiteNav variant="app" />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
        </Link>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{job?.title ?? "Job"}</h1>
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-muted-foreground">
              {job?.description ?? ""}
            </p>
            {!!job?.required_skills?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.required_skills.map((s: string) => (
                  <span
                    key={s}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <AddCandidateDialog
            jobId={jobId}
            onDone={() => qc.invalidateQueries({ queryKey: ["candidates", jobId] })}
          />
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total candidates" value={candidates.length} />
          <StatCard label="Average match" value={`${avg}%`} />
          <StatCard
            label="Excellent matches"
            value={candidates.filter((c) => Number(c.match_score) >= 80).length}
          />
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or skills…"
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-4 font-medium">No candidates yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a resume and let AI rank it against this job.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-12">#</th>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3 min-w-[200px]">Match</th>
                    <th className="px-4 py-3">Exp</th>
                    <th className="px-4 py-3">Top skills</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const score = Number(c.match_score);
                    const tone =
                      score >= 80 ? "success" : score >= 60 ? "primary" : "destructive";
                    const label =
                      score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Low";
                    return (
                      <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.name ?? "Unnamed"}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.email ?? "—"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted min-w-[80px]">
                              <div
                                className="h-full gradient-primary-bg"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-semibold">
                              {score}%
                            </span>
                            <span
                              className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${
                                tone === "success"
                                  ? "bg-success/10 text-success"
                                  : tone === "destructive"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                              }`}
                            >
                              {label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.experience_years ? `${Number(c.experience_years)}y` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.skills ?? []).slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize">
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to="/candidates/$candidateId"
                              params={{ candidateId: c.id }}
                              className="text-primary hover:underline text-sm font-medium"
                            >
                              View
                            </Link>
                            <DeleteButton candidateId={c.id} jobId={jobId} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function DeleteButton({ candidateId, jobId }: { candidateId: string; jobId: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("candidates").delete().eq("id", candidateId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates", jobId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={(e) => {
        e.preventDefault();
        del.mutate();
      }}
    >
      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}

function AddCandidateDialog({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const analyze = useServerFn(analyzeResume);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useMutation({
    mutationFn: async () => {
      if (resumeText.trim().length < 30) {
        throw new Error("Resume text is too short. Paste the full resume.");
      }
      await analyze({ data: { jobId, resumeText } });
    },
    onSuccess: () => {
      toast.success("Resume analyzed and ranked");
      setResumeText("");
      setOpen(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const readTextFile = useCallback(async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2MB). Paste text instead.");
      return;
    }
    const isText =
      file.type.startsWith("text/") ||
      /\.(txt|md|rtf|csv)$/i.test(file.name);
    if (!isText) {
      toast.info(
        "For best results, paste resume text. Binary files (PDF/DOCX) aren't supported yet — copy the text from the file and paste below.",
      );
      return;
    }
    const text = await file.text();
    setResumeText(text);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary-bg shadow-elegant">
          <Upload className="mr-1.5 h-4 w-4" /> Add resume
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a candidate</DialogTitle>
          <DialogDescription>
            Drop a .txt file or paste the full resume text. AI will parse and score it against
            this job.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) readTextFile(file);
          }}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm font-medium">Drop a resume file here</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plain text works best — or paste below
          </p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".txt,.md,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readTextFile(file);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Textarea
            rows={10}
            placeholder="Paste the full resume text here…"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {resumeText.length} characters
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="gradient-primary-bg"
          >
            {run.isPending ? "Analyzing with AI…" : "Analyze & rank"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
