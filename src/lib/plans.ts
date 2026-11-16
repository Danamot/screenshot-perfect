/** Planes comerciales de TrendLatam AI. Precios en USD por mes. */
export type PlanId = "free" | "pro";

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  tagline: string;
  /** Productos visibles por día; null = ilimitado. */
  productsPerDay: number | null;
  /** Países disponibles; null = todos los de Latam. */
  countries: number | null;
  features: PlanFeature[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Plan Gratuito",
    priceUsd: 0,
    tagline: "Para validar tus primeras ideas de producto.",
    productsPerDay: 3,
    countries: 1,
    features: [
      { label: "3 productos ganadores por día", included: true },
      { label: "1 país a elección", included: true },
      { label: "Barra de viralidad y origen de datos", included: true },
      { label: "Filtros de saturación", included: false },
      { label: "Análisis de IA completos", included: false },
      { label: "Alertas de tendencias", included: false },
    ],
  },
  {
    id: "pro",
    name: "Plan Pro",
    priceUsd: 29,
    tagline: "Para tiendas que quieren llegar primero a cada tendencia.",
    productsPerDay: null,
    countries: null,
    features: [
      { label: "Productos ilimitados", included: true },
      { label: "Todos los países de Latam", included: true },
      { label: "Filtros de saturación", included: true },
      { label: "Análisis de IA completos", included: true },
      { label: "Alertas de tendencias", included: true },
    ],
  },
];

export function formatPlanPrice(plan: Plan) {
  return plan.priceUsd === 0 ? "$0" : `$${plan.priceUsd} USD`;
}
