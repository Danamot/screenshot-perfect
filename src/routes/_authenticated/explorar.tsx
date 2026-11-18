import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Activity, Crown, Flame, Loader2, MapPin, PackageSearch, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FilterSidebar } from "@/components/dashboard/FilterSidebar";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { AnalysisDialog } from "@/components/dashboard/AnalysisDialog";
import { accountQueryOptions, dashboardProductsQueryOptions, setMyCountry } from "@/lib/account";
import { getAccess } from "@/lib/plans";
import { useProCheckout } from "@/hooks/use-pro-checkout";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  SOURCE_ORDER,
  filterProducts,
  type CountryCode,
  type Product,
  type ProductFilters,
} from "@/lib/products";

export const Route = createFileRoute("/_authenticated/explorar")({
  validateSearch: (search: Record<string, unknown>): { pago?: "ok" | undefined } => ({
    pago: search["pago"] === "ok" ? "ok" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explorar productos ganadores — TrendLatam AI" },
      {
        name: "description",
        content:
          "Descubre productos virales en Uruguay, México, Colombia y más, con señales de TikTok, Instagram, Mercado Libre y Google Trends.",
      },
      { property: "og:title", content: "Explorar productos ganadores — TrendLatam AI" },
      {
        property: "og:description",
        content: "Dashboard de productos ganadores para e-commerce y dropshipping en Latinoamérica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(accountQueryOptions(context.user.id)),
      context.queryClient.ensureQueryData(dashboardProductsQueryOptions(context.user.id)),
    ]);
  },
  pendingComponent: () => (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
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

function CountryPicker({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: setMyCountry,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["account", userId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-products", userId] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border border-primary/30 bg-accent/40 p-6 sm:p-8">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-background/60 text-primary-glow">
        <MapPin className="h-5 w-5" />
      </span>
      <h2 className="text-xl font-bold">¿En qué país vendes?</h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        El Plan Gratuito incluye un país. Te mostraremos sus 3 productos más virales de hoy. Con el Plan Pro
        desbloqueas toda Latinoamérica.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {COUNTRY_ORDER.map((c) => (
          <Button
            key={c}
            variant="surface"
            className="h-12 justify-start text-sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(c)}
          >
            <span aria-hidden className="text-lg">{COUNTRIES[c].flag}</span> {COUNTRIES[c].name}
          </Button>
        ))}
      </div>
    </section>
  );
}

function FreePlanBanner({ country, shown }: { country: CountryCode; shown: number }) {
  const startCheckout = useProCheckout();
  return (
    <section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-primary/30 bg-accent/40 px-5 py-4 sm:flex-row sm:items-center">
      <p className="text-sm">
        <span className="font-semibold">Plan Gratuito:</span>{" "}
        <span className="text-muted-foreground">
          estás viendo los {shown} productos más virales de hoy en {COUNTRIES[country].flag} {COUNTRIES[country].name}.
          Filtros de saturación y análisis de IA disponibles en Pro.
        </span>
      </p>
      <Button variant="glow" size="sm" className="shrink-0" onClick={startCheckout}>
        <Crown /> Quiero el Plan Pro
      </Button>
    </section>
  );
}

/** Tras volver del pago, espera a que el webhook active el Plan Pro (hasta ~1 minuto). */
function useActivationAfterPayment(userId: string, paid: boolean, fullAccess: boolean) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!paid) return;
    if (fullAccess) {
      if (waiting) toast.success("¡Tu Plan Pro está activo! Ya ves todos los productos.");
      setWaiting(false);
      navigate({ to: "/explorar", search: {}, replace: true });
      return;
    }
    setWaiting(true);
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      void queryClient.invalidateQueries({ queryKey: ["account", userId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-products", userId] });
      if (tries >= 20) {
        window.clearInterval(id);
        setWaiting(false);
        toast("Tu pago se está procesando", {
          description: "El Plan Pro se activará en unos minutos. Recarga la página más tarde.",
        });
        navigate({ to: "/explorar", search: {}, replace: true });
      }
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, fullAccess]);

  return waiting;
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: account } = useSuspenseQuery(accountQueryOptions(user.id));
  const { data: products } = useSuspenseQuery(dashboardProductsQueryOptions(user.id));
  const access = getAccess(account);
  const { pago } = Route.useSearch();
  const activating = useActivationAfterPayment(user.id, pago === "ok", access.fullAccess);

  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Product | null>(null);

  // Plan Gratuito: el país es fijo y la saturación no se filtra.
  useEffect(() => {
    if (!access.fullAccess) setFilters((f) => ({ ...f, country: account.pais ?? "ALL", saturation: "ALL" }));
  }, [access.fullAccess, account.pais]);

  const resetFilters = () =>
    setFilters(access.fullAccess ? DEFAULT_FILTERS : { ...DEFAULT_FILTERS, country: account.pais ?? "ALL" });

  const results = useMemo(() => filterProducts(products, filters), [products, filters]);
  const avgTrend = results.length
    ? Math.round(results.reduce((acc, p) => acc + p.trend, 0) / results.length)
    : 0;
  const hotCount = results.filter((p) => p.trend >= 85).length;
  const regionLabel = filters.country === "ALL" ? "Toda Latinoamérica" : COUNTRIES[filters.country].name;
  const needsCountry = !access.fullAccess && !account.pais;

  return (
    <div className="min-h-[calc(100vh-4rem)] lg:flex">
      <FilterSidebar
        filters={filters}
        products={products}
        lockedCountry={access.fullAccess ? undefined : account.pais}
        saturationLocked={!access.canFilterSaturation}
        onChange={setFilters}
        onReset={resetFilters}
      />

      <main className="flex-1 bg-ambient">
        <div className="mx-auto max-w-[1400px] space-y-6 p-5 sm:p-8">
          <header className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-electric">
              {needsCountry ? "Bienvenido" : regionLabel}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Productos <span className="text-gradient-brand">ganadores</span> esta semana
            </h1>
            <p className="text-sm text-muted-foreground">
              Ordenados por viralidad combinada en redes sociales y marketplaces.
            </p>
          </header>

          {activating && (
            <section className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-5 py-4 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-success" />
              <span>¡Gracias por tu pago! Estamos activando tu Plan Pro…</span>
            </section>
          )}

          {needsCountry ? (
            !activating && <CountryPicker userId={user.id} />
          ) : (
            <>
              {!access.fullAccess && account.pais && <FreePlanBanner country={account.pais} shown={products.length} />}

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
                  <Button variant="surface" onClick={resetFilters}>
                    Limpiar filtros
                  </Button>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <AnalysisDialog product={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
