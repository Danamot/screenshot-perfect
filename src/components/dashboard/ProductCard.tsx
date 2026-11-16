import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COUNTRIES, marginPercent, priceParts, type Product } from "@/lib/products";
import { PlatformIcon } from "./PlatformIcon";
import { TrendMeter } from "./TrendMeter";
import { SaturationBadge } from "./SaturationBadge";

function MetricLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{children}</p>;
}

export function ProductCard({ product, onAnalyze }: { product: Product; onAnalyze: () => void }) {
  const country = COUNTRIES[product.country];
  const price = priceParts(product.price, product.country);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={816}
          height={816}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-card-fade" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-glow">
            <span aria-hidden>{country.flag}</span> {country.name}
          </span>
          <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur">
            {product.category}
          </span>
        </div>
        <span className="absolute right-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-background/70 px-2 py-1 font-mono text-[11px] font-semibold text-success backdrop-blur">
          <ArrowUpRight className="h-3 w-3" />
          {product.growth7d}% 7d
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug">
          {product.name}
        </h3>

        <dl className="grid grid-cols-[1.35fr_1fr_1fr] divide-x divide-border rounded-lg border border-border bg-surface-elevated py-2">
          <div className="min-w-0 px-2.5">
            <dt><MetricLabel>Precio est.</MetricLabel></dt>
            <dd className="mt-0.5 truncate font-mono text-sm font-semibold" title={`${price.amount} ${price.code}`}>
              {price.amount} <span className="text-[10px] font-medium text-muted-foreground">{price.code}</span>
            </dd>
          </div>
          <div className="min-w-0 px-2.5">
            <dt><MetricLabel>Margen</MetricLabel></dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-success">
              {marginPercent(product)}% <span className="font-sans text-[10px] font-medium">margen</span>
            </dd>
          </div>
          <div className="min-w-0 px-2.5">
            <dt><MetricLabel>Saturación</MetricLabel></dt>
            <dd className="mt-0.5">
              <SaturationBadge level={product.saturation} />
            </dd>
          </div>
        </dl>

        <TrendMeter value={product.trend} />

        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tráfico desde</span>
          <div className="flex gap-1.5">
            {product.sources.map((s) => (
              <PlatformIcon key={s} source={s} />
            ))}
          </div>
        </div>

        <Button variant="glow" className="mt-auto w-full" onClick={onAnalyze}>
          <Sparkles />
          Ver Análisis de IA
        </Button>
      </div>
    </article>
  );
}
