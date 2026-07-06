import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Briefcase, Users, Sparkles, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { extractJobDescription } from "@/lib/screening.functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TalentLens AI" }] }),
  component: Dashboard,
});

type JobRow = {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  created_at: string;
};

function Dashboard() {
  const qc = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, description, required_skills, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobRow[];
    },
  });

  const { data: candidateCounts } = useQuery({
    queryKey: ["candidate-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("job_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        map[r.job_id] = (map[r.job_id] ?? 0) + 1;
      });
      return map;
    },
  });

  return (
    <div className="min-h-screen gradient-mesh-bg">
      <SiteNav variant="app" />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your jobs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a job description, then screen resumes against it with AI.
            </p>
          </div>
          <NewJobDialog onCreated={() => qc.invalidateQueries({ queryKey: ["jobs"] })} />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition hover:shadow-elegant hover:-translate-y-1"
              >
                <div className="absolute inset-x-0 top-0 h-1 gradient-primary-bg opacity-70" />
                <div className="mb-3 flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="truncate text-lg font-semibold">{job.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {job.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(job.required_skills ?? []).slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                    >
                      {s}
                    </span>
                  ))}
                  {(job.required_skills ?? []).length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{job.required_skills.length - 3} more
                    </span>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {candidateCounts?.[job.id] ?? 0} candidates
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-panel flex flex-col items-center rounded-2xl p-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary-bg text-primary-foreground shadow-elegant">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Create your first job</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Paste a job description and TalentLens AI will extract required skills and start ranking
        candidates for you.
      </p>
    </div>
  );
}

function NewJobDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const extractJd = useServerFn(extractJobDescription);

  const create = useMutation({
    mutationFn: async () => {
      if (!description.trim() || description.trim().length < 20) {
        throw new Error("Please paste a job description (at least 20 characters).");
      }
      const extracted = await extractJd({ data: { description } });
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in");
      const finalTitle = title.trim() || extracted.title || "Untitled role";
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          user_id: userRes.user.id,
          title: finalTitle,
          description,
          required_skills: extracted.required_skills ?? [],
          preferred_skills: extracted.preferred_skills ?? [],
          keywords: extracted.keywords ?? [],
          min_experience_years: extracted.min_experience_years ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Job created — analyzed by AI");
      setOpen(false);
      setTitle("");
      setDescription("");
      onCreated();
      navigate({ to: "/jobs/$jobId", params: { jobId: id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary-bg shadow-elegant">
          <Plus className="mr-1.5 h-4 w-4" /> New job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New job description</DialogTitle>
          <DialogDescription>
            Paste the JD — AI will extract required skills and keywords automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Role title (optional)</Label>
            <Input
              id="title"
              placeholder="e.g. Senior Full-Stack Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jd">Job description</Label>
            <Textarea
              id="jd"
              placeholder="Paste the full job description here…"
              rows={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="gradient-primary-bg"
          >
            {create.isPending ? "Analyzing with AI…" : "Create & analyze"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
