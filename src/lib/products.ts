
export type CountryCode = "UY" | "MX" | "CO" | "AR" | "CL" | "BR";
export type SourceId = "tiktok" | "instagram" | "mercadolibre" | "google";

export const COUNTRIES: Record<
  CountryCode,
  { name: string; flag: string; currency: string; symbol: string; mlDomain: string }
> = {
  UY: { name: "Uruguay", flag: "🇺🇾", currency: "UYU", symbol: "$", mlDomain: "listado.mercadolibre.com.uy" },
  MX: { name: "México", flag: "🇲🇽", currency: "MXN", symbol: "$", mlDomain: "listado.mercadolibre.com.mx" },
  CO: { name: "Colombia", flag: "🇨🇴", currency: "COP", symbol: "$", mlDomain: "listado.mercadolibre.com.co" },
  AR: { name: "Argentina", flag: "🇦🇷", currency: "ARS", symbol: "$", mlDomain: "listado.mercadolibre.com.ar" },
  CL: { name: "Chile", flag: "🇨🇱", currency: "CLP", symbol: "$", mlDomain: "listado.mercadolibre.cl" },
  BR: { name: "Brasil", flag: "🇧🇷", currency: "BRL", symbol: "R$", mlDomain: "lista.mercadolivre.com.br" },
};

export const COUNTRY_ORDER: CountryCode[] = ["UY", "MX", "CO", "AR", "CL", "BR"];

export const SOURCES: Record<SourceId, { label: string }> = {
  tiktok: { label: "TikTok Trends" },
  instagram: { label: "Instagram Reels" },
  mercadolibre: { label: "Mercado Libre Bestsellers" },
  google: { label: "Google Trends" },
};

export const SOURCE_ORDER: SourceId[] = ["tiktok", "instagram", "mercadolibre", "google"];

/** Nivel de competencia actual del producto en su país. */
export type SaturationLevel = "baja" | "media" | "alta";

export const SATURATION: Record<SaturationLevel, { label: string }> = {
  baja: { label: "Baja" },
  media: { label: "Media" },
  alta: { label: "Alta" },
};

export const SATURATION_ORDER: SaturationLevel[] = ["baja", "media", "alta"];

export interface ProductAnalysis {
  resumen: string;
  puntos: string[];
}

export interface Product {
  /** Identificador legible (slug) */
  id: string;
  name: string;
  category: string;
  country: CountryCode;
  sources: SourceId[];
  /** Viralidad 0–100 */
  trend: number;
  /** Crecimiento de interés en los últimos 7 días, en % */
  growth7d: number;
  image: string;
  price: number;
  /** Margen estimado de ganancia, en % */
  margin: number;
  activeAds: number;
  competitors: number;
  saturation: SaturationLevel;
  keywords: string[];
  /** Interés semanal de las últimas 12 semanas (0–100) */
  series: number[];
  /** null cuando el plan del usuario no incluye el análisis de IA */
  analysis: ProductAnalysis | null;
}

/** Fila tal como la devuelve la base de datos (tabla products). */
export interface ProductRow {
  slug: string;
  nombre: string;
  pais: string;
  categoria: string;
  precio_estimado: number;
  margen: number;
  saturacion: string;
  viralidad: number;
  crecimiento_7d: number;
  fuentes: string[];
  imagen_url: string | null;
  analisis_ia: unknown;
  palabras_clave: string[];
  anuncios_activos: number;
  competidores: number;
  interes_semanal: number[];
}

function isCountry(v: string): v is CountryCode {
  return v in COUNTRIES;
}

function parseAnalysis(raw: unknown): ProductAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { resumen?: unknown; puntos?: unknown };
  if (typeof r.resumen !== "string") return null;
  const puntos = Array.isArray(r.puntos) ? r.puntos.filter((x): x is string => typeof x === "string") : [];
  return { resumen: r.resumen, puntos };
}

/** Convierte una fila de la base de datos en el producto que muestran las tarjetas. */
export function rowToProduct(row: ProductRow): Product {
  const country: CountryCode = isCountry(row.pais) ? row.pais : "UY";
  const saturation = (SATURATION_ORDER as string[]).includes(row.saturacion)
    ? (row.saturacion as SaturationLevel)
    : "media";
  return {
    id: row.slug,
    name: row.nombre,
    category: row.categoria,
    country,
    sources: row.fuentes.filter((s): s is SourceId => (SOURCE_ORDER as string[]).includes(s)),
    trend: row.viralidad,
    growth7d: row.crecimiento_7d,
    image: row.imagen_url ?? "",
    price: Number(row.precio_estimado),
    margin: row.margen,
    activeAds: row.anuncios_activos,
    competitors: row.competidores,
    saturation,
    keywords: row.palabras_clave,
    series: row.interes_semanal,
    analysis: parseAnalysis(row.analisis_ia),
  };
}

export interface ProductFilters {
  country: CountryCode | "ALL";
  sources: SourceId[];
  saturation: SaturationLevel | "ALL";
  query: string;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Filtra por país, por fuentes activas (alcanza con que el producto sea fuerte en una
 * de ellas), por nivel de saturación y por palabra clave en nombre, categoría o keywords. Ordena por tendencia.
 */
export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const q = normalize(filters.query.trim());
  return products
    .filter((p) => filters.country === "ALL" || p.country === filters.country)
    .filter((p) => p.sources.some((s) => filters.sources.includes(s)))
    .filter((p) => filters.saturation === "ALL" || p.saturation === filters.saturation)
    .filter((p) => {
      if (!q) return true;
      const haystack = normalize([p.name, p.category, ...p.keywords].join(" "));
      return haystack.includes(q);
    })
    .sort((a, b) => b.trend - a.trend);
}

/** Precio separado en monto con símbolo ("$1.490") y código de moneda ("UYU"). */
export function priceParts(value: number, country: CountryCode) {
  const c = COUNTRIES[country];
  return { amount: `${c.symbol}${value.toLocaleString("es-UY")}`, code: c.currency };
}

/** Ej.: "$1.490 UYU", "R$149 BRL". */
export function formatPrice(value: number, country: CountryCode) {
  const { amount, code } = priceParts(value, country);
  return `${amount} ${code}`;
}

export function tiktokSearchUrl(p: Product) {
  return `https://www.tiktok.com/search?q=${encodeURIComponent((p.keywords[0] ?? p.name) + " " + p.category)}`;
}

export function mercadoLibreSearchUrl(p: Product) {
  const slug = encodeURIComponent(p.keywords.slice(0, 2).join("-").replace(/\s+/g, "-"));
  return `https://${COUNTRIES[p.country].mlDomain}/${slug}`;
}
