import { describe, expect, it } from "vitest";
import { PRODUCTS, SOURCE_ORDER, filterProducts } from "./products";

const all = { country: "ALL" as const, sources: SOURCE_ORDER, query: "" };

describe("filterProducts", () => {
  it("ships at least 10 mock products covering Uruguay, México and Colombia", () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(10);
    for (const c of ["UY", "MX", "CO"]) {
      expect(PRODUCTS.some((p) => p.country === c)).toBe(true);
    }
  });

  it("shows only the selected country", () => {
    const res = filterProducts(PRODUCTS, { ...all, country: "UY" });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((p) => p.country === "UY")).toBe(true);
  });

  it("hides products whose sources are all turned off", () => {
    const res = filterProducts(PRODUCTS, { ...all, sources: ["google"] });
    expect(res.every((p) => p.sources.includes("google"))).toBe(true);
    expect(res.find((p) => p.id === "mini-proyector")).toBeUndefined();
  });

  it("shows nothing when every source is off", () => {
    expect(filterProducts(PRODUCTS, { ...all, sources: [] })).toHaveLength(0);
  });

  it("matches keywords ignoring accents and case", () => {
    const res = filterProducts(PRODUCTS, { ...all, query: "LAMPARA" });
    expect(res.map((p) => p.id)).toEqual(["lampara-luna"]);
  });

  it("orders results from highest to lowest trend", () => {
    const res = filterProducts(PRODUCTS, all);
    expect(res[0].id).toBe("mini-proyector");
    for (let i = 1; i < res.length; i++) expect(res[i - 1].trend).toBeGreaterThanOrEqual(res[i].trend);
  });
});
