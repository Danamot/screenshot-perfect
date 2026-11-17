import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  COUNTRIES,
  SATURATION_ORDER,
  SOURCE_ORDER,
  type CountryCode,
  type SaturationLevel,
  type SourceId,
} from "@/lib/products";

export type AdminProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

/** Lo que el administrador escribe en el formulario (todo como texto, como en los inputs). */
export interface ProductForm {
  nombre: string;
  pais: CountryCode;
  categoria: string;
  precio_estimado: string;
  moneda: string;
  margen: string;
  saturacion: SaturationLevel;
  viralidad: string;
  crecimiento_7d: string;
  fuentes: SourceId[];
  imagen_url: string;
  resumen: string;
  /** Una razón por línea */
  puntos: string;
  /** Separadas por coma */
  palabras_clave: string;
}

export type FormErrors = { [K in keyof ProductForm]?: string | undefined };

export interface ProductValues {
  nombre: string;
  pais: CountryCode;
  categoria: string;
  precio_estimado: number;
  moneda: string;
  margen: number;
  saturacion: SaturationLevel;
  viralidad: number;
  crecimiento_7d: number;
  fuentes: SourceId[];
  imagen_url: string | null;
  analisis_ia: { resumen: string; puntos: string[] } | null;
  palabras_clave: string[];
}

export function emptyForm(pais: CountryCode = "UY"): ProductForm {
  return {
    nombre: "",
    pais,
    categoria: "",
    precio_estimado: "",
    moneda: COUNTRIES[pais].currency,
    margen: "",
    saturacion: "media",
    viralidad: "",
    crecimiento_7d: "",
    fuentes: [],
    imagen_url: "",
    resumen: "",
    puntos: "",
    palabras_clave: "",
  };
}

export function rowToForm(row: AdminProductRow): ProductForm {
  const pais = (row.pais in COUNTRIES ? row.pais : "UY") as CountryCode;
  const analysis = (row.analisis_ia ?? null) as { resumen?: unknown; puntos?: unknown } | null;
  const puntos = Array.isArray(analysis?.puntos) ? analysis.puntos.filter((p): p is string => typeof p === "string") : [];
  return {
    nombre: row.nombre,
    pais,
    categoria: row.categoria,
    precio_estimado: String(row.precio_estimado),
    moneda: row.moneda,
    margen: String(row.margen),
    saturacion: (SATURATION_ORDER as string[]).includes(row.saturacion) ? (row.saturacion as SaturationLevel) : "media",
    viralidad: String(row.viralidad),
    crecimiento_7d: String(row.crecimiento_7d),
    fuentes: row.fuentes.filter((s): s is SourceId => (SOURCE_ORDER as string[]).includes(s)),
    imagen_url: row.imagen_url ?? "",
    resumen: typeof analysis?.resumen === "string" ? analysis.resumen : "",
    puntos: puntos.join("\n"),
    palabras_clave: row.palabras_clave.join(", "),
  };
}

function toNumber(raw: string) {
  const s = raw.trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

/** Revisa el formulario con las mismas reglas que exige la base de datos. */
export function validateForm(form: ProductForm): { ok: true; values: ProductValues } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};
  const nombre = form.nombre.trim();
  const categoria = form.categoria.trim();
  const moneda = form.moneda.trim().toUpperCase();
  const precio = toNumber(form.precio_estimado);
  const margen = toNumber(form.margen);
  const viralidad = toNumber(form.viralidad);
  const crecimiento = toNumber(form.crecimiento_7d);
  const imagen = form.imagen_url.trim();

  if (!nombre) errors.nombre = "Escribe el nombre del producto.";
  else if (nombre.length > 160) errors.nombre = "Máximo 160 caracteres.";
  if (!(form.pais in COUNTRIES)) errors.pais = "Elige un país.";
  if (!categoria) errors.categoria = "Escribe la categoría.";
  if (!Number.isFinite(precio) || precio < 0) errors.precio_estimado = "Escribe un precio de 0 o más.";
  if (!/^[A-Z]{3}$/.test(moneda)) errors.moneda = "Usa un código de 3 letras, ej. UYU.";
  if (!Number.isInteger(margen) || margen < 0 || margen > 100) errors.margen = "Un número entero de 0 a 100.";
  if (!Number.isInteger(viralidad) || viralidad < 0 || viralidad > 100) errors.viralidad = "Un número entero de 0 a 100.";
  if (!Number.isInteger(crecimiento) || crecimiento < -100 || crecimiento > 1000)
    errors.crecimiento_7d = "Un número entero, ej. 24 o -5.";
  if (form.fuentes.length === 0) errors.fuentes = "Marca al menos una fuente.";
  if (imagen && !imagen.startsWith("/") && !/^https:\/\//i.test(imagen))
    errors.imagen_url = "Usa una dirección que empiece con https:// o /products/.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const resumen = form.resumen.trim();
  const puntos = form.puntos
    .split("\n")
    .map((p) => p.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
  const palabras = form.palabras_clave
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  return {
    ok: true,
    values: {
      nombre,
      pais: form.pais,
      categoria,
      precio_estimado: Math.round(precio * 100) / 100,
      moneda,
      margen,
      saturacion: form.saturacion,
      viralidad,
      crecimiento_7d: crecimiento,
      fuentes: SOURCE_ORDER.filter((s) => form.fuentes.includes(s)),
      imagen_url: imagen || null,
      analisis_ia: resumen ? { resumen, puntos } : null,
      palabras_clave: palabras.length > 0 ? palabras : [nombre.toLowerCase()],
    },
  };
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Curva de interés de 12 semanas que termina en la viralidad actual y respeta el crecimiento de 7 días. */
export function buildInterestSeries(viralidad: number, crecimiento7d: number): number[] {
  const last = Math.max(0, Math.min(100, viralidad));
  const prev = Math.max(0, Math.min(100, Math.round(last / (1 + crecimiento7d / 100))));
  const start = Math.min(prev, Math.max(5, Math.round(last * 0.35)));
  const series: number[] = [];
  for (let i = 0; i < 11; i++) series.push(Math.round(start + ((prev - start) * i) / 10));
  series.push(last);
  return series;
}

export function valuesToInsert(values: ProductValues, slugSuffix: string): ProductInsert {
  return {
    ...values,
    slug: `${slugify(values.nombre) || "producto"}-${slugSuffix}`,
    interes_semanal: buildInterestSeries(values.viralidad, values.crecimiento_7d),
  };
}

export function valuesToUpdate(values: ProductValues): ProductUpdate {
  return { ...values };
}

export const adminProductsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .order("viralidad", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export async function isCurrentUserAdmin(userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return data === true;
}

export async function createProduct(values: ProductValues) {
  const suffix = Math.random().toString(36).slice(2, 6);
  const { error } = await supabase.from("products").insert(valuesToInsert(values, suffix));
  if (error) throw error;
}

export async function updateProduct(id: string, values: ProductValues) {
  const { error } = await supabase.from("products").update(valuesToUpdate(values)).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
