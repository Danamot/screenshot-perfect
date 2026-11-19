/**
 * Datos de producto que llegan desde Make.com: validación y normalización (sin acceso a la base de datos).
 * Las reglas coinciden con las del formulario del panel de administración y con los CHECK de la tabla products.
 */
import { z } from "zod";
import { buildInterestSeries, slugify } from "@/lib/admin";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  SOURCE_ORDER,
  type CountryCode,
  type SaturationLevel,
  type SourceId,
} from "@/lib/products";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COUNTRY_ALIASES: Record<string, CountryCode> = Object.fromEntries(
  COUNTRY_ORDER.flatMap((code) => [
    [normalize(code), code],
    [normalize(COUNTRIES[code].name), code],
  ]),
);
COUNTRY_ALIASES["brazil"] = "BR";
COUNTRY_ALIASES["mexico"] = "MX";

const SOURCE_ALIASES: Record<string, SourceId> = {
  tiktok: "tiktok",
  "tiktok trends": "tiktok",
  "tik tok": "tiktok",
  instagram: "instagram",
  "instagram reels": "instagram",
  ig: "instagram",
  mercadolibre: "mercadolibre",
  "mercado libre": "mercadolibre",
  "mercado libre bestsellers": "mercadolibre",
  mercadolivre: "mercadolibre",
  "mercado livre": "mercadolibre",
  ml: "mercadolibre",
  google: "google",
  "google trends": "google",
};

const SATURATION_ALIASES: Record<string, SaturationLevel> = {
  baja: "baja",
  low: "baja",
  media: "media",
  medio: "media",
  medium: "media",
  alta: "alta",
  alto: "alta",
  high: "alta",
};

/** Make suele mandar números como texto ("65", "1.490,50"); también listas como texto separado por comas. */
function toNumber(v: unknown): unknown {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return v;
  let s = v.trim().replace(/[%$\s]/g, "");
  if (s === "") return undefined;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : v;
}

function toList(separator: RegExp) {
  return (v: unknown): unknown => {
    if (v == null || v === "") return undefined;
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return v.split(separator);
    return v;
  };
}

const emptyToUndefined = (v: unknown) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v);

const intRange = (min: number, max: number, msg: string) =>
  z.preprocess(toNumber, z.number({ invalid_type_error: msg, required_error: msg }).int(msg).min(min, msg).max(max, msg));

export const MakeProductSchema = z.object({
  nombre: z.string({ required_error: "Falta el nombre." }).trim().min(1, "Falta el nombre.").max(160, "Nombre: máximo 160 caracteres."),
  pais: z
    .string({ required_error: "Falta el país." })
    .transform((v, ctx) => {
      const code = COUNTRY_ALIASES[normalize(v)];
      if (!code) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `País no válido. Usa uno de: ${COUNTRY_ORDER.join(", ")}.` });
        return z.NEVER;
      }
      return code;
    }),
  categoria: z.string({ required_error: "Falta la categoría." }).trim().min(1, "Falta la categoría.").max(80),
  precio_estimado: z.preprocess(
    toNumber,
    z
      .number({ invalid_type_error: "precio_estimado debe ser un número.", required_error: "Falta precio_estimado." })
      .min(0, "precio_estimado debe ser 0 o más.")
      .max(1_000_000_000),
  ),
  moneda: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "moneda debe ser un código de 3 letras, ej. UYU.")
      .optional(),
  ),
  margen: intRange(0, 100, "margen debe ser un número entero de 0 a 100."),
  saturacion: z
    .string({ required_error: "Falta la saturación." })
    .transform((v, ctx) => {
      const level = SATURATION_ALIASES[normalize(v)];
      if (!level) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "saturacion debe ser baja, media o alta." });
        return z.NEVER;
      }
      return level;
    }),
  viralidad: intRange(0, 100, "viralidad debe ser un número entero de 0 a 100."),
  crecimiento_7d: intRange(-100, 1000, "crecimiento_7d debe ser un número entero, ej. 24 o -5."),
  fuentes: z.preprocess(
    toList(/[,;|]/),
    z
      .array(z.string().max(60), { required_error: "Falta fuentes." })
      .max(10)
      .transform((list, ctx) => {
        const ids = new Set<SourceId>();
        for (const raw of list) {
          if (normalize(raw) === "") continue;
          const id = SOURCE_ALIASES[normalize(raw)];
          if (!id) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Fuente desconocida: "${raw}". Usa TikTok, Instagram, Mercado Libre o Google.`,
            });
            return z.NEVER;
          }
          ids.add(id);
        }
        if (ids.size === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fuentes debe tener al menos una fuente." });
          return z.NEVER;
        }
        return SOURCE_ORDER.filter((s) => ids.has(s));
      }),
  ),
  imagen_url: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v.startsWith("/") || /^https:\/\//i.test(v), "imagen_url debe empezar con https:// o /products/.")
      .optional(),
  ),
  resumen_ia: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  razones_ia: z.preprocess(
    toList(/\r?\n/),
    z
      .array(z.string().max(500))
      .max(10)
      .transform((l) => l.map((p) => p.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean))
      .optional(),
  ),
  palabras_clave: z.preprocess(
    toList(/,/),
    z
      .array(z.string().max(80))
      .max(20)
      .transform((l) => l.map((k) => k.trim().toLowerCase()).filter(Boolean))
      .optional(),
  ),
});

export type MakeProduct = z.output<typeof MakeProductSchema>;

export type ParseResult = { ok: true; product: MakeProduct } | { ok: false; errors: string[] };

export function parseMakeProduct(input: unknown): ParseResult {
  const parsed = MakeProductSchema.safeParse(input);
  if (parsed.success) return { ok: true, product: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)),
  };
}

/** Columnas de métricas que siempre se actualizan; el resto solo si Make las envía. */
export function productColumns(p: MakeProduct) {
  const analysis =
    p.resumen_ia || (p.razones_ia && p.razones_ia.length > 0)
      ? { resumen: p.resumen_ia ?? "", puntos: p.razones_ia ?? [] }
      : undefined;
  return {
    categoria: p.categoria,
    precio_estimado: Math.round(p.precio_estimado * 100) / 100,
    moneda: p.moneda ?? COUNTRIES[p.pais].currency,
    margen: p.margen,
    saturacion: p.saturacion,
    viralidad: p.viralidad,
    crecimiento_7d: p.crecimiento_7d,
    fuentes: p.fuentes,
    ...(p.imagen_url !== undefined ? { imagen_url: p.imagen_url } : {}),
    ...(analysis ? { analisis_ia: analysis } : {}),
    ...(p.palabras_clave && p.palabras_clave.length > 0 ? { palabras_clave: p.palabras_clave } : {}),
  };
}

export function insertRow(p: MakeProduct, slugSuffix: string) {
  return {
    ...productColumns(p),
    nombre: p.nombre,
    pais: p.pais,
    slug: `${slugify(p.nombre) || "producto"}-${p.pais.toLowerCase()}-${slugSuffix}`,
    palabras_clave: p.palabras_clave && p.palabras_clave.length > 0 ? p.palabras_clave : [p.nombre.toLowerCase()],
    interes_semanal: buildInterestSeries(p.viralidad, p.crecimiento_7d),
  };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Curva de 12 semanas al actualizar: si pasó una semana desde la última actualización
 * agrega un punto nuevo (y descarta el más viejo); si no, reemplaza el punto de esta semana.
 */
export function nextInterestSeries(previous: number[], viralidad: number, lastUpdatedAt: Date, now: Date): number[] {
  if (previous.length !== 12) return buildInterestSeries(viralidad, 0);
  const value = Math.max(0, Math.min(100, viralidad));
  if (now.getTime() - lastUpdatedAt.getTime() >= WEEK_MS) return [...previous.slice(1), value];
  return [...previous.slice(0, 11), value];
}

/** Comparación en tiempo constante del header x-api-key. */
export function apiKeyMatches(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i % (a.length || 1)] ?? 0) ^ b[i]!;
  return diff === 0;
}
