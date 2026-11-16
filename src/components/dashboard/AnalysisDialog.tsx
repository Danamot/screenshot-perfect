import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@tanstack/react-router";
import { BadgeDollarSign, Crown, ExternalLink, Lock, Megaphone, Percent, Sparkles, Store } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  COUNTRIES,
  formatPrice,
  mercadoLibreSearchUrl,
  tiktokSearchUrl,
  type Product,
} from "@/lib/products";
import { PlatformIcon } from "./PlatformIcon";
import { TrendMeter } from "./TrendMeter";

function weekLabel(i: number) {
  return i === 11 ? "Hoy" : `S-${11 - i}`;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

export function AnalysisDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-border bg-popover p-0 sm:rounded-2xl">
        {product && <AnalysisBody product={product} />}
      </DialogContent>
    </Dialog>
  );
}

function AnalysisBody({ product }: { product: Product }) {
  const country = COUNTRIES[product.country];
  const data = product.series.map((v, i) => ({ week: weekLabel(i), interes: v }));

  return (
    <div>
      <div className="flex gap-4 border-b border-border bg-ambient p-6 pr-12">
        <img
          src={product.image}
          alt={product.name}
          width={816}
          height={816}
          className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
        />
        <DialogHeader className="space-y-2 text-left">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-gradient-brand px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
              {country.flag} {country.name}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
              {product.category}
            </span>
          </div>
          <DialogTitle className="font-display text-xl leading-tight">{product.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>Fuerte en</span>
            {product.sources.map((s) => (
              <PlatformIcon key={s} source={s} />
            ))}
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="space-y-6 p-6">
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h4 className="text-sm font-semibold">Interés en el tiempo</h4>
              <p className="text-xs text-muted-foreground">Últimas 12 semanas · {country.name}</p>
            </div>
            <span className="font-mono text-xs font-semibold text-success">+{product.growth7d}% últimos 7 días</span>
          </div>
          <div className="h-56 w-full rounded-xl border border-border bg-surface p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--electric)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--electric)" />
                    <stop offset="100%" stopColor="var(--primary-glow)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "var(--primary)", strokeOpacity: 0.4 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}`, "Interés"]}
                />
                <Area type="monotone" dataKey="interes" stroke="url(#trendStroke)" strokeWidth={2.5} fill="url(#trendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={BadgeDollarSign} label="Precio sugerido" value={formatPrice(product.price, product.country)} />
          <Metric icon={Percent} label="Margen" value={`${product.margin}%`} />
          <Metric icon={Megaphone} label="Anuncios activos" value={String(product.activeAds)} />
          <Metric icon={Store} label="Competidores" value={String(product.competitors)} />
        </section>

        {product.analysis ? (
          <section className="rounded-xl border border-primary/30 bg-accent/40 p-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary-glow" />
              Por qué es ganador en {country.name}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{product.analysis.resumen}</p>
            <ul className="mt-3 space-y-1.5">
              {product.analysis.puntos.map((pt) => (
                <li key={pt} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-brand" />
                  {pt}
                </li>
              ))}
            </ul>
            <TrendMeter value={product.trend} className="mt-4" />
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-xl border border-primary/30 bg-accent/40 p-5">
            <div aria-hidden className="space-y-2 blur-sm select-none">
              <div className="h-3 w-2/3 rounded bg-muted-foreground/30" />
              <div className="h-3 w-full rounded bg-muted-foreground/20" />
              <div className="h-3 w-5/6 rounded bg-muted-foreground/20" />
              <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 p-4 text-center backdrop-blur-[2px]">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="h-4 w-4 text-primary-glow" /> El análisis de IA completo es parte del Plan Pro
              </p>
              <Button variant="glow" size="sm" asChild>
                <Link to="/precios">
                  <Crown /> Ver Plan Pro
                </Link>
              </Button>
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2">
          <Button variant="surface" size="lg" asChild>
            <a href={tiktokSearchUrl(product)} target="_blank" rel="noopener noreferrer">
              <PlatformIcon source="tiktok" />
              Ver anuncio en TikTok
              <ExternalLink className="ml-auto opacity-60" />
            </a>
          </Button>
          <Button variant="surface" size="lg" asChild>
            <a href={mercadoLibreSearchUrl(product)} target="_blank" rel="noopener noreferrer">
              <PlatformIcon source="mercadolibre" />
              Ver competidores en Mercado Libre
              <ExternalLink className="ml-auto opacity-60" />
            </a>
          </Button>
        </section>
      </div>
    </div>
  );
}
