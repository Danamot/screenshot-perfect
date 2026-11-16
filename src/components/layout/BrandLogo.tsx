import { Radar } from "lucide-react";

export function BrandLogo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
        <Radar className="h-[18px] w-[18px] text-primary-foreground" />
      </span>
      <span className="font-display text-[15px] font-bold tracking-tight">
        TrendLatam <span className="text-gradient-brand">AI</span>
      </span>
    </span>
  );
}
