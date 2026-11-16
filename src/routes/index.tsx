import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Flame, PackageSearch, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSidebar } from "@/components/dashboard/FilterSidebar";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { AnalysisDialog } from "@/components/dashboard/AnalysisDialog";
import {
  COUNTRIES,
  PRODUCTS,
  SOURCE_ORDER,
  filterProducts,
  type Product,
  type ProductFilters,
} from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Radar Ganador — Productos ganadores para dropshipping en LATAM" },
      {
        name: "description",
        content:
          "Descubre productos virales en Uruguay, México, Colombia y más, con señales de TikTok, Instagram, Mercado Libre y Google Trends.",
      },
      { property: "og:title", content: "Radar Ganador — Productos ganadores LATAM" },
      {
        property: "og:description",
        content: "Dashboard de productos ganadores para e-commerce y dropshipping en Latinoamérica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const DEFAULT_FILTERS: ProductFilters = {
  country: "ALL",
  sources: [...SOURCE_ORDER],
  saturation: "ALL",
  query: "",
};

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary-glow">
        <Icon className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-mono text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Product | null>(null);

  const results = useMemo(() => filterProducts(PRODUCTS, filters), [filters]);
  const avgTrend = results.length
    ? Math.round(results.reduce((acc, p) => acc + p.trend, 0) / results.length)
    : 0;
  const hotCount = results.filter((p) => p.trend >= 85).length;
  const regionLabel = filters.country === "ALL" ? "Toda Latinoamérica" : COUNTRIES[filters.country].name;

  return (
    <div className="min-h-screen lg:flex">
      <FilterSidebar filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      <main className="flex-1 bg-ambient">
        <div className="mx-auto max-w-[1400px] space-y-6 p-5 sm:p-8">
          <header className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-electric">
              {regionLabel}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Productos <span className="text-gradient-brand">ganadores</span> esta semana
            </h1>
            <p className="text-sm text-muted-foreground">
              Ordenados por viralidad combinada en redes sociales y marketplaces.
            </p>
          </header>

          <section className="grid gap-3 sm:grid-cols-3">
            <Stat icon={PackageSearch} label="Productos encontrados" value={String(results.length)} />
            <Stat icon={Activity} label="Tendencia promedio" value={`${avgTrend}%`} />
            <Stat icon={Flame} label="En llamas (≥85%)" value={String(hotCount)} />
          </section>

          {results.length > 0 ? (
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} onAnalyze={() => setSelected(p)} />
              ))}
            </section>
          ) : (
            <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
              <SearchX className="h-10 w-10 text-muted-foreground" />
              <p className="font-display text-lg font-semibold">Sin resultados con estos filtros</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Prueba con otro país, otro nivel de saturación, activa más fuentes o cambia la palabra clave.
              </p>
              <Button variant="surface" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Limpiar filtros
              </Button>
            </section>
          )}
        </div>
      </main>

      <AnalysisDialog product={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
