import { describe, expect, it } from "vitest";
import { SOURCE_ORDER, filterProducts, formatPrice, rowToProduct, type Product } from "./products";

const all = { country: "ALL" as const, sources: SOURCE_ORDER, saturation: "ALL" as const, query: "" };

function make(id: string, over: Partial<Product>): Product {
  return {
    id,
    name: id,
    category: "Hogar",
    country: "UY",
    sources: ["tiktok"],
    trend: 50,
    growth7d: 10,
    image: "",
    price: 100,
    margin: 60,
    activeAds: 0,
    competitors: 0,
    saturation: "media",
    keywords: [],
    series: [],
    analysis: null,
    ...over,
  };
}

const FIXTURE: Product[] = [
  make("mini-proyector", { country: "UY", trend: 94, sources: ["tiktok", "mercadolibre"], saturation: "media" }),
  make("masajeador-facial", { country: "MX", trend: 92, sources: ["tiktok", "google"], saturation: "alta" }),
  make("corrector-postura", { country: "MX", trend: 89, sources: ["tiktok", "instagram"], saturation: "alta" }),
  make("lampara-luna", { name: "Lámpara Luna 3D", country: "UY", trend: 77, sources: ["instagram"], saturation: "baja" }),
  make("auriculares-oseos", { country: "MX", trend: 71, sources: ["google"], saturation: "baja" }),
];

describe("filterProducts", () => {
  it("shows only the selected country", () => {
    const res = filterProducts(FIXTURE, { ...all, country: "UY" });
    expect(res.map((p) => p.id)).toEqual(["mini-proyector", "lampara-luna"]);
  });

  it("hides products whose sources are all turned off", () => {
    const res = filterProducts(FIXTURE, { ...all, sources: ["google"] });
    expect(res.map((p) => p.id)).toEqual(["masajeador-facial", "auriculares-oseos"]);
  });

  it("shows nothing when every source is off", () => {
    expect(filterProducts(FIXTURE, { ...all, sources: [] })).toHaveLength(0);
  });

  it("matches keywords ignoring accents and case", () => {
    const res = filterProducts(FIXTURE, { ...all, query: "LAMPARA" });
    expect(res.map((p) => p.id)).toEqual(["lampara-luna"]);
  });

  it("orders results from highest to lowest trend", () => {
    const trends = filterProducts(FIXTURE, all).map((p) => p.trend);
    expect(trends).toEqual([94, 92, 89, 77, 71]);
  });

  it("combines saturation with country", () => {
    const res = filterProducts(FIXTURE, { ...all, country: "MX", saturation: "alta" });
    expect(res.map((p) => p.id).sort()).toEqual(["corrector-postura", "masajeador-facial"]);
  });
});

describe("database rows", () => {
  const row = {
    slug: "mini-proyector",
    nombre: "Mini Proyector",
    pais: "UY",
    categoria: "Electrónica",
    precio_estimado: 3290,
    margen: 65,
    saturacion: "media",
    viralidad: 94,
    crecimiento_7d: 48,
    fuentes: ["tiktok", "mercadolibre"],
    imagen_url: "/products/mini-proyector.jpg",
    analisis_ia: { resumen: "Explota en TikTok", puntos: ["Margen alto"] },
    palabras_clave: ["proyector"],
    anuncios_activos: 214,
    competidores: 38,
    interes_semanal: [10, 94],
  };

  it("maps a product row to card data", () => {
    const p = rowToProduct(row);
    expect(p).toMatchObject({ id: "mini-proyector", country: "UY", price: 3290, margin: 65, trend: 94 });
    expect(p.analysis).toEqual({ resumen: "Explota en TikTok", puntos: ["Margen alto"] });
  });

  it("treats a missing AI analysis as locked", () => {
    expect(rowToProduct({ ...row, analisis_ia: null }).analysis).toBeNull();
  });
});

describe("commercial metrics", () => {
  it("formats suggested price with local currency code", () => {
    expect(formatPrice(1490, "UY")).toBe("$1.490 UYU");
    expect(formatPrice(149, "BR")).toBe("R$149 BRL");
  });
});
