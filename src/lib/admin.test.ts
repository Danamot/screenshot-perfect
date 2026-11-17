import { describe, expect, it } from "vitest";
import { buildInterestSeries, emptyForm, slugify, validateForm, valuesToInsert, type ProductForm } from "./admin";

function filled(over: Partial<ProductForm> = {}): ProductForm {
  return {
    ...emptyForm("MX"),
    nombre: "Lámpara Luna 3D",
    categoria: "Hogar",
    precio_estimado: "499",
    margen: "65",
    viralidad: "88",
    crecimiento_7d: "24",
    fuentes: ["tiktok"],
    ...over,
  };
}

describe("formulario del panel de administración", () => {
  it("usa la moneda del país elegido por defecto", () => {
    expect(emptyForm("MX").moneda).toBe("MXN");
    expect(emptyForm("BR").moneda).toBe("BRL");
  });

  it("rechaza margen y viralidad fuera de 0 a 100", () => {
    const r = validateForm(filled({ margen: "120", viralidad: "-1" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.margen).toBeDefined();
      expect(r.errors.viralidad).toBeDefined();
    }
  });

  it("exige al menos una fuente", () => {
    const r = validateForm(filled({ fuentes: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.fuentes).toBeDefined();
  });

  it("solo acepta imágenes https o de la app", () => {
    expect(validateForm(filled({ imagen_url: "http://x.com/a.jpg" })).ok).toBe(false);
    expect(validateForm(filled({ imagen_url: "https://x.com/a.jpg" })).ok).toBe(true);
    expect(validateForm(filled({ imagen_url: "/products/lampara-luna.jpg" })).ok).toBe(true);
  });

  it("guarda el análisis con resumen y una razón por línea", () => {
    const r = validateForm(filled({ resumen: "Gana en México.", puntos: "- Regalo ideal\n\n2. Viral en TikTok" }));
    expect(r.ok && r.values.analisis_ia).toEqual({ resumen: "Gana en México.", puntos: ["Regalo ideal", "Viral en TikTok"] });
  });

  it("sin resumen no guarda análisis", () => {
    const r = validateForm(filled({ resumen: "  " }));
    expect(r.ok && r.values.analisis_ia).toBeNull();
  });

  it("crea un identificador legible a partir del nombre", () => {
    expect(slugify("Lámpara Luna 3D")).toBe("lampara-luna-3d");
    const r = validateForm(filled());
    if (!r.ok) throw new Error("debería ser válido");
    expect(valuesToInsert(r.values, "ab12").slug).toBe("lampara-luna-3d-ab12");
  });

  it("la curva de interés tiene 12 semanas y termina en la viralidad", () => {
    const s = buildInterestSeries(88, 24);
    expect(s).toHaveLength(12);
    expect(s[11]).toBe(88);
    expect(s[10]).toBe(71);
  });
});
