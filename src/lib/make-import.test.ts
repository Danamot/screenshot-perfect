import { describe, expect, it } from "vitest";
import { apiKeyMatches, insertRow, nextInterestSeries, parseMakeProduct, productColumns } from "./make-import";

const sample = {
  nombre: "Lámpara Luna 3D",
  pais: "MX",
  categoria: "Hogar",
  precio_estimado: 499,
  moneda: "MXN",
  margen: 65,
  saturacion: "baja",
  viralidad: 88,
  crecimiento_7d: 24,
  fuentes: ["TikTok", "Instagram"],
  imagen_url: "https://example.com/luna.jpg",
  resumen_ia: "Regalo viral.",
  razones_ia: ["Se ve bien en video", "Precio de impulso", "Poca competencia"],
  palabras_clave: ["lampara luna", "regalo"],
};

function ok(input: unknown) {
  const r = parseMakeProduct(input);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.product;
}

describe("importación desde Make.com", () => {
  it("acepta el ejemplo completo y guarda el análisis de IA", () => {
    const cols = productColumns(ok(sample));
    expect(cols.fuentes).toEqual(["tiktok", "instagram"]);
    expect(cols.analisis_ia).toEqual({ resumen: "Regalo viral.", puntos: sample.razones_ia });
  });

  it("entiende los valores como texto que suele mandar Make", () => {
    const p = ok({
      ...sample,
      pais: "Uruguay",
      precio_estimado: "1.490,50",
      margen: "65%",
      saturacion: "Alta",
      fuentes: "Mercado Libre, Google Trends",
      razones_ia: "1. Uno\n2. Dos",
      palabras_clave: "Luna, Regalo",
    });
    expect(p.pais).toBe("UY");
    expect(p.precio_estimado).toBe(1490.5);
    expect(p.margen).toBe(65);
    expect(p.saturacion).toBe("alta");
    expect(p.fuentes).toEqual(["mercadolibre", "google"]);
    expect(p.razones_ia).toEqual(["Uno", "Dos"]);
    expect(p.palabras_clave).toEqual(["luna", "regalo"]);
  });

  it("usa la moneda del país si Make no la envía", () => {
    const { moneda: _m, ...rest } = sample;
    expect(productColumns(ok({ ...rest, pais: "BR" })).moneda).toBe("BRL");
  });

  it("rechaza país, margen y fuentes no válidos", () => {
    const r = parseMakeProduct({ ...sample, pais: "PE", margen: 140, fuentes: ["Facebook"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(3);
  });

  it("al actualizar no borra imagen ni análisis si Make no los envía", () => {
    const { imagen_url: _i, resumen_ia: _r, razones_ia: _z, palabras_clave: _k, ...metrics } = sample;
    const cols = productColumns(ok(metrics));
    expect("imagen_url" in cols).toBe(false);
    expect("analisis_ia" in cols).toBe(false);
    expect("palabras_clave" in cols).toBe(false);
  });

  it("un producto nuevo tiene curva de 12 semanas que termina en su viralidad", () => {
    const row = insertRow(ok(sample), "ab12");
    expect(row.interes_semanal).toHaveLength(12);
    expect(row.interes_semanal[11]).toBe(88);
    expect(row.slug).toBe("lampara-luna-3d-mx-ab12");
  });

  it("la curva agrega una semana solo si pasaron 7 días", () => {
    const prev = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const last = new Date("2026-11-01T00:00:00Z");
    expect(nextInterestSeries(prev, 90, last, new Date("2026-11-03T00:00:00Z"))).toEqual([...prev.slice(0, 11), 90]);
    expect(nextInterestSeries(prev, 90, last, new Date("2026-11-08T00:00:00Z"))).toEqual([...prev.slice(1), 90]);
  });

  it("solo acepta la clave exacta", () => {
    expect(apiKeyMatches("secreto-123", "secreto-123")).toBe(true);
    expect(apiKeyMatches("secreto-12", "secreto-123")).toBe(false);
    expect(apiKeyMatches(null, "secreto-123")).toBe(false);
    expect(apiKeyMatches("", "secreto-123")).toBe(false);
  });
});
