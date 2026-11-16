import { describe, expect, it } from "vitest";
import { PLANS, formatPlanPrice, getAccess } from "./plans";

const free = PLANS.find((p) => p.id === "free")!;
const pro = PLANS.find((p) => p.id === "pro")!;

describe("plans", () => {
  it("free plan costs $0/month with 3 products per day and 1 country", () => {
    expect(free.priceUsd).toBe(0);
    expect(formatPlanPrice(free)).toBe("$0");
    expect(free.productsPerDay).toBe(3);
    expect(free.countries).toBe(1);
  });

  it("pro plan costs $29 USD/month with unlimited products and every country", () => {
    expect(pro.priceUsd).toBe(29);
    expect(formatPlanPrice(pro)).toBe("$29 USD");
    expect(pro.productsPerDay).toBeNull();
    expect(pro.countries).toBeNull();
  });

  it("only pro includes saturation filters, full AI analysis and trend alerts", () => {
    for (const label of ["Filtros de saturación", "Análisis de IA completos", "Alertas de tendencias"]) {
      expect(pro.features.find((f) => f.label === label)?.included).toBe(true);
      expect(free.features.find((f) => f.label === label)?.included).toBe(false);
    }
  });

  it("free accounts see 3 products of 1 country, without saturation filter or AI analysis", () => {
    const a = getAccess({ plan: "free", isAdmin: false });
    expect(a).toEqual({ fullAccess: false, productsPerDay: 3, countries: 1, canFilterSaturation: false, canSeeAiAnalysis: false });
  });

  it("pro accounts get everything", () => {
    const a = getAccess({ plan: "pro", isAdmin: false });
    expect(a).toEqual({ fullAccess: true, productsPerDay: null, countries: null, canFilterSaturation: true, canSeeAiAnalysis: true });
  });

  it("admins get everything even on the free plan", () => {
    expect(getAccess({ plan: "free", isAdmin: true }).fullAccess).toBe(true);
  });
});
