import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeDollarSign, Globe2, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { SaturationBadge } from "@/components/dashboard/SaturationBadge";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  SATURATION_ORDER,
  SOURCE_ORDER,
  type CountryCode,
  type SaturationLevel,
  type SourceId,
  priceParts,
} from "@/lib/products";
import { getLandingPreview } from "@/lib/preview.functions";

const previewQueryOptions = () =>
  queryOptions({ queryKey: ["landing-preview"], queryFn: () => getLandingPreview(), staleTime: 5 * 60_000 });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrendLatam AI — Productos ganadores antes que tu competencia" },
      {
        name: "description",
        content:
          "Cruzamos datos de TikTok, Instagram, Mercado Libre y Google Trends por país para encontrar productos ganadores en Latinoamérica.",
      },
      { property: "og:title", content: "TrendLatam AI — Productos ganadores en Latinoamérica" },
      {
        property: "og:description",
        content: "Descubre qué vender en Uruguay, México, Colombia y más, con viralidad, margen y saturación por país.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(previewQueryOptions());
  },
  component: Landing,
});

const SOURCE_SHORT: Record<SourceId, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  mercadolibre: "Mercado Libre",
  google: "Google Trends",
};

const ADVANTAGES = [
  {
    icon: Globe2,
    title: "Análisis por País",
    text: "Cada mercado se comporta distinto. Ves qué está explotando en Uruguay, México, Colombia, Argentina, Chile y Brasil por separado.",
    detail: COUNTRY_ORDER.map((c) => COUNTRIES[c].flag).join("  "),
  },
  {
    icon: Layers,
    title: "Cruce de Redes + Marketplace",
    text: "Unimos la viralidad de TikTok e Instagram con las ventas reales de Mercado Libre y las búsquedas de Google Trends.",
    detail: "Señal social + intención de compra",
  },
  {
    icon: BadgeDollarSign,
    title: "Métricas de Rentabilidad",
    text: "Precio sugerido en moneda local, margen estimado y nivel de saturación para decidir rápido si vale la pena entrar.",
    detail: "Precio · Margen · Saturación",
  },
] as const;

function PreviewPanel() {
  const { data } = useSuspenseQuery(previewQueryOptions());
  const top = data
    .filter((p) => p.pais in COUNTRIES)
    .map((p) => ({
      id: p.slug,
      name: p.nombre,
      country: p.pais as CountryCode,
      price: p.precio,
      margin: p.margen,
      trend: p.viralidad,
      image: p.imagen,
      saturation: ((SATURATION_ORDER as string[]).includes(p.saturacion) ? p.saturacion : "media") as SaturationLevel,
    }));
  return (
    <div className="relative min-w-0">
      <div aria-hidden className="absolute -inset-6 rounded-3xl bg-gradient-brand opacity-20 blur-3xl" />
      <div className="relative rounded-2xl border border-border bg-card/90 p-4 shadow-card backdrop-blur">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top de la semana</p>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> En vivo
          </span>
        </div>
        <ul className="space-y-2.5">
          {top.map((p) => {
            const price = priceParts(p.price, p.country);
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated p-2.5">
                <img src={p.image} alt={p.name} width={816} height={816} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate text-sm font-semibold">
                    <span aria-hidden>{COUNTRIES[p.country].flag}</span> {p.name}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-trend animate-trend-fill" style={{ width: `${p.trend}%` }} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono text-foreground">{price.amount} {price.code}</span>
                    <span className="font-mono font-semibold text-success">{p.margin}% margen</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-mono text-sm font-semibold">{p.trend}%</span>
                  <SaturationBadge level={p.saturation} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <main className="overflow-x-clip bg-ambient">
      <section className="mx-auto grid max-w-[1400px] items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
        <div className="min-w-0 space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
            Señales actualizadas cada semana en 6 países
          </span>
          <h1 className="text-4xl font-bold leading-[1.08] sm:text-5xl xl:text-6xl">
            Descubre los productos ganadores{" "}
            <span className="text-gradient-brand">antes que tu competencia</span> en Latinoamérica
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Cruzamos datos reales de TikTok, Instagram, Mercado Libre y Google Trends, país por país,
            para mostrarte qué está creciendo, cuánto puedes ganar y cuánta competencia hay.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="glow" size="lg" className="h-12 px-7 text-base" asChild>
              <Link to="/explorar">
                Explorar Dashboard Gratis
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="surface" size="lg" className="h-12" asChild>
              <Link to="/precios">Ver precios</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Fuentes</span>
            {SOURCE_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                <PlatformIcon source={s} />
                <span className="hidden sm:inline">{SOURCE_SHORT[s]}</span>
              </span>
            ))}
          </div>
        </div>
        <PreviewPanel />
      </section>

      <section aria-labelledby="ventajas" className="border-t border-border bg-surface/60">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8">
          <div className="mb-10 max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-electric">Por qué TrendLatam AI</p>
            <h2 id="ventajas" className="text-3xl font-bold">Todo lo que necesitas para elegir qué vender</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {ADVANTAGES.map(({ icon: Icon, title, text, detail }) => (
              <article key={title} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/40">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary-glow">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 font-mono text-xs text-foreground/80">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-primary/30 bg-accent/40 p-8 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Empieza gratis hoy</h2>
            <p className="text-muted-foreground">Sin tarjeta. Mira los productos ganadores de esta semana en segundos.</p>
          </div>
          <Button variant="glow" size="lg" className="h-12 px-7" asChild>
            <Link to="/explorar">
              Explorar Dashboard Gratis
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
