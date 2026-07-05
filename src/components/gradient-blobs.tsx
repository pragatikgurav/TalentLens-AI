export function GradientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-primary/30 blur-3xl animate-blob" />
      <div
        className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full blur-3xl animate-blob"
        style={{ background: "oklch(0.72 0.20 320 / 0.30)", animationDelay: "3s" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full blur-3xl animate-blob"
        style={{ background: "oklch(0.72 0.18 220 / 0.28)", animationDelay: "6s" }}
      />
    </div>
  );
}
