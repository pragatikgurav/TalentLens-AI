import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { GradientBlobs } from "@/components/gradient-blobs";
import {
  Sparkles,
  FileSearch,
  BarChart3,
  Target,
  Users,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen gradient-mesh-bg">
      <SiteNav variant="landing" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <GradientBlobs />
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Powered by Lovable AI — semantic resume matching
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-7xl">
              Hire smarter with{" "}
              <span className="text-gradient">AI resume screening</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Parse resumes, extract skills, education and experience, and rank candidates
              against any job description using AI-powered semantic matching — in seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gradient-primary-bg shadow-elegant">
                <a href="https://resume-quest-match.lovable.app/" target="_blank" rel="noreferrer">
                  Open output page <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="glass-panel">
                <a href="https://resume-quest-match.lovable.app/">Open live demo</a>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {["No setup", "Instant AI parsing", "Semantic match scoring"].map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {f}
                </span>
              ))}
            </div>
          </div>

          {/* Preview card */}
          <div
            id="output-preview"
            className="relative mx-auto mt-16 max-w-5xl scroll-mt-24 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="mb-4 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Output preview
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                See how candidate ranking and match scores appear in the live screening workflow.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-2 shadow-[0_20px_60px_-24px_rgba(79,70,229,0.35)] backdrop-blur-xl">
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Job
                    </p>
                    <p className="font-semibold">Senior Full-Stack Engineer</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                      12 candidates
                    </span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Avg match 78%
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "Aisha Rahman", score: 94, tag: "Excellent", tone: "success" },
                    { name: "Diego Martinez", score: 82, tag: "Good", tone: "primary" },
                    { name: "Priya Chen", score: 71, tag: "Good", tone: "primary" },
                    { name: "Marcus Wolfe", score: 48, tag: "Low", tone: "destructive" },
                  ].map((c, i) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-4 rounded-xl border border-border/40 bg-card/50 p-3 transition hover:bg-accent/40"
                    >
                      <span className="w-6 text-sm font-semibold text-muted-foreground">
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                      </div>
                      <div className="w-40">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full gradient-primary-bg"
                            style={{ width: `${c.score}%` }}
                          />
                        </div>
                      </div>
                      <span className={`w-12 text-right text-sm font-semibold`}>
                        {c.score}%
                      </span>
                      <span
                        className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${
                          c.tone === "success"
                            ? "bg-success/10 text-success"
                            : c.tone === "destructive"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {c.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to screen candidates fast
          </h2>
          <p className="mt-4 text-muted-foreground">
            From resume parsing to candidate ranking — end-to-end, in one place.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition hover:shadow-elegant hover:-translate-y-1"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl gradient-primary-bg text-primary-foreground shadow-elegant">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl gradient-hero-bg p-12 text-center shadow-elegant">
          <div className="absolute inset-0 opacity-30 mix-blend-overlay">
            <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to rank your next candidate?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Sign in and drop your first resume. AI-powered scoring in under 10 seconds.
            </p>
            <Button asChild size="lg" className="mt-6 bg-white text-primary hover:bg-white/90">
              <Link to="/auth">
                Start screening <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TalentLens AI. Built with Lovable.
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: FileSearch,
    title: "AI resume parsing",
    desc: "Auto-extract name, skills, education, experience, projects and certifications from raw resume text.",
  },
  {
    icon: Target,
    title: "Semantic matching",
    desc: "Compare each resume against your job description with skill, experience, education and keyword scores.",
  },
  {
    icon: BarChart3,
    title: "Ranking dashboard",
    desc: "Instantly rank candidates with match %, colored badges, sort and filter — no spreadsheets.",
  },
  {
    icon: Users,
    title: "Candidate profiles",
    desc: "Rich profiles with AI summary, strengths, gaps, missing skills and a hiring recommendation.",
  },
  {
    icon: Zap,
    title: "Fast by default",
    desc: "Screen dozens of resumes in the time it took to skim one — powered by Lovable AI.",
  },
  {
    icon: Sparkles,
    title: "Elegant workflow",
    desc: "Beautiful, focused UI that stays out of your way. Built for hiring managers and recruiters.",
  },
];
