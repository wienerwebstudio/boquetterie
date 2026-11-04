import { cn } from "@/lib/format";

type Tone = "forest" | "rose" | "sand" | "ink" | "success" | "outline";

const tones: Record<Tone, string> = {
  forest: "bg-forest text-ivory",
  rose: "bg-rose-100 text-burgundy",
  sand: "bg-sand text-ink",
  ink: "bg-ink text-ivory",
  success: "bg-[#e6f0ea] text-success",
  outline: "border border-line text-ink-muted bg-white/70",
};

export function Badge({ tone = "sand", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]", tones[tone], className)}>
      {children}
    </span>
  );
}
