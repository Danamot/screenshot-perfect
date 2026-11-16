import { cn } from "@/lib/utils";
import { SATURATION, type SaturationLevel } from "@/lib/products";

const TONE: Record<SaturationLevel, { badge: string; dot: string }> = {
  baja: { badge: "border-success/30 bg-success/10 text-success", dot: "bg-success" },
  media: { badge: "border-warning/30 bg-warning/10 text-warning", dot: "bg-warning" },
  alta: { badge: "border-destructive/30 bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

export function SaturationDot({ level, className }: { level: SaturationLevel; className?: string }) {
  return <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE[level].dot, className)} />;
}

export function SaturationBadge({ level, className }: { level: SaturationLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        TONE[level].badge,
        className,
      )}
    >
      <SaturationDot level={level} />
      {SATURATION[level].label}
    </span>
  );
}
