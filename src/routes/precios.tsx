import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, formatPlanPrice, type Plan } from "@/lib/plans";

export const Route = createFileRoute("/precios")({
  head: () => ({
    meta: [
      { title: "Precios — TrendLatam AI" },
      {
        name: "description",
        content: "Plan Gratuito por $0/mes o Plan Pro por $29 USD/mes con todos los países de Latam, filtros de saturación y análisis de IA.",
      },
      { property: "og:title", content: "Precios — TrendLatam AI" },
      {
        property: "og:description",
        content: "Compara el Plan Gratuito y el Plan Pro de TrendLatam AI para encontrar productos ganadores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

function PlanCard({ plan }: { plan: Plan }) {
  const pro = plan.id === "pro";
  return (
    <article
      aria-label={`${plan.name}, ${formatPlanPrice(plan)} por mes`}
      className={cn(
        "relative flex flex-col gap-6 rounded-2xl border bg-card p-7 shadow-card",
        pro ? "border-primary/50 shadow-glow" : "border-border",
      )}
    >
      {pro && (
        <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-glow">
          <Crown className="h-3.5 w-3.5" /> Más completo
        </span>
      )}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">{plan.name}</h2>
        <p className="text-sm text-muted-foreground">{plan.tagline}</p>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className={cn("font-display text-5xl font-bold", pro && "text-gradient-brand")}>${plan.priceUsd}</span>
        <span className="text-sm text-muted-foreground">{plan.priceUsd === 0 ? "/mes" : "USD/mes"}</span>
      </p>
      <ul className="flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f.label} className={cn("flex items-center gap-3 text-sm", !f.included && "text-muted-foreground")}>
            {f.included ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Minus className="h-3.5 w-3.5" />
              </span>
            )}
            <span className={cn(!f.included && "line-through decoration-muted-foreground/40")}>{f.label}</span>
            {!f.included && <span className="sr-only">(no incluido)</span>}
          </li>
        ))}
      </ul>
      {pro ? (
        <Button
          variant="glow"
          size="lg"
          className="h-12 w-full"
          onClick={() =>
            toast("El Plan Pro estará disponible muy pronto", {
              description: "Todavía no aceptamos pagos. Puedes seguir usando el dashboard gratis.",
            })
          }
        >
          Quiero el Plan Pro
        </Button>
      ) : (
        <Button variant="surface" size="lg" className="h-12 w-full" asChild>
          <Link to="/explorar">Empezar gratis</Link>
        </Button>
      )}
    </article>
  );
}

function Pricing() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-ambient">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-24">
        <header className="mx-auto mb-14 max-w-2xl space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-electric">Precios</p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Elige cómo quieres <span className="text-gradient-brand">encontrar tu próximo ganador</span>
          </h1>
          <p className="text-muted-foreground">Empieza gratis y pásate a Pro cuando quieras vender en toda Latinoamérica.</p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">Precios en dólares estadounidenses por mes.</p>
      </div>
    </main>
  );
}
