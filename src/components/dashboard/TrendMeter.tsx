import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrendMeter({ value, className }: { value: number; className?: string }) {
  const hot = value >= 85;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium text-muted-foreground">
          {hot && <Flame className="h-3.5 w-3.5 text-primary-glow" />}
          Viralidad
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {value}% <span className="text-muted-foreground font-normal">tendencia</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${value}% tendencia`}
      >
        <div
          className={cn("h-full rounded-full bg-gradient-trend animate-trend-fill", hot && "shadow-glow")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
