import miniProyector from "@/assets/products/mini-proyector.jpg";
import correctorPostura from "@/assets/products/corrector-postura.jpg";
import botellaTermica from "@/assets/products/botella-termica.jpg";
import lamparaLuna from "@/assets/products/lampara-luna.jpg";
import masajeadorFacial from "@/assets/products/masajeador-facial.jpg";
import cepilloAlisador from "@/assets/products/cepillo-alisador.jpg";
import organizadorMaquillaje from "@/assets/products/organizador-maquillaje.jpg";
import comederoAutomatico from "@/assets/products/comedero-automatico.jpg";
import licuadoraPortatil from "@/assets/products/licuadora-portatil.jpg";
import quitapelusas from "@/assets/products/quitapelusas.jpg";
import auricularesOseos from "@/assets/products/auriculares-oseos.jpg";
import tiraLed from "@/assets/products/tira-led.jpg";

export type CountryCode = "UY" | "MX" | "CO" | "AR" | "CL" | "BR";
export type SourceId = "tiktok" | "instagram" | "mercadolibre" | "google";

export const COUNTRIES: Record<
  CountryCode,
  { name: string; flag: string; currency: string; mlDomain: string }
> = {
  UY: { name: "Uruguay", flag: "🇺🇾", currency: "$U", mlDomain: "listado.mercadolibre.com.uy" },
  MX: { name: "México", flag: "🇲🇽", currency: "MXN $", mlDomain: "listado.mercadolibre.com.mx" },
  CO: { name: "Colombia", flag: "🇨🇴", currency: "COP $", mlDomain: "listado.mercadolibre.com.co" },
  AR: { name: "Argentina", flag: "🇦🇷", currency: "ARS $", mlDomain: "listado.mercadolibre.com.ar" },
  CL: { name: "Chile", flag: "🇨🇱", currency: "CLP $", mlDomain: "listado.mercadolibre.cl" },
  BR: { name: "Brasil", flag: "🇧🇷", currency: "R$", mlDomain: "lista.mercadolivre.com.br" },
};

export const COUNTRY_ORDER: CountryCode[] = ["UY", "MX", "CO", "AR", "CL", "BR"];

export const SOURCES: Record<SourceId, { label: string }> = {
  tiktok: { label: "TikTok Trends" },
  instagram: { label: "Instagram Reels" },
  mercadolibre: { label: "Mercado Libre Bestsellers" },
  google: { label: "Google Trends" },
};

export const SOURCE_ORDER: SourceId[] = ["tiktok", "instagram", "mercadolibre", "google"];

export interface Product {
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
  cost: number;
  activeAds: number;
  competitors: number;
  keywords: string[];
  /** Interés semanal de las últimas 12 semanas (0–100) */
  series: number[];
  whyIntro: string;
  whyPoints: string[];
}

/** Curva de interés determinística: arranque bajo, crecimiento y pico reciente. */
function buildSeries(seed: number, peak: number, shape: "rising" | "spike" | "steady"): number[] {
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const noise = Math.sin(seed * 9.13 + i * 1.7) * 5;
    let v: number;
    if (shape === "spike") v = 18 + Math.pow(t, 3.2) * (peak - 18);
    else if (shape === "steady") v = peak * 0.55 + t * peak * 0.4;
    else v = 22 + Math.pow(t, 1.6) * (peak - 22);
    out.push(Math.max(4, Math.min(100, Math.round(v + noise))));
  }
  out[11] = peak;
  return out;
}

export const PRODUCTS: Product[] = [
  {
    id: "mini-proyector",
    name: "Mini Proyector Portátil HD 4K",
    category: "Electrónica",
    country: "UY",
    sources: ["tiktok", "mercadolibre"],
    trend: 94,
    growth7d: 48,
    image: miniProyector,
    price: 3290,
    cost: 1150,
    activeAds: 214,
    competitors: 38,
    keywords: ["proyector", "cine en casa", "netflix", "android"],
    series: buildSeries(1, 94, "spike"),
    whyIntro:
      "En Uruguay el formato “cine en el dormitorio” explotó en TikTok con videos de unboxing nocturno. La oferta local en Mercado Libre todavía es corta y con plazos de envío largos, lo que deja espacio para un vendedor con stock propio.",
    whyPoints: [
      "Ticket medio alto con margen superior al 60%.",
      "Pocos competidores con envío en 24 h en Montevideo.",
      "Contenido UGC muy fácil de replicar: proyección en techo o pared.",
    ],
  },
  {
    id: "corrector-postura",
    name: "Corrector de Postura Inteligente con Sensor",
    category: "Salud",
    country: "MX",
    sources: ["tiktok", "instagram"],
    trend: 89,
    growth7d: 31,
    image: correctorPostura,
    price: 549,
    cost: 165,
    activeAds: 342,
    competitors: 71,
    keywords: ["postura", "espalda", "home office", "sensor"],
    series: buildSeries(2, 89, "rising"),
    whyIntro:
      "El home office sigue fuerte en CDMX, Monterrey y Guadalajara. Los Reels de fisioterapeutas mostrando el antes/después generan alto engagement y el sensor de vibración lo diferencia de los correctores tradicionales.",
    whyPoints: [
      "Problema doloroso y cotidiano: dolor de espalda por escritorio.",
      "El sensor permite posicionarlo como producto ‘tech’ premium.",
      "Funciona muy bien con creadores de salud y bienestar.",
    ],
  },
  {
    id: "botella-termica",
    name: "Botella Térmica con Display LED de Temperatura",
    category: "Hogar",
    country: "CO",
    sources: ["instagram", "mercadolibre", "google"],
    trend: 81,
    growth7d: 18,
    image: botellaTermica,
    price: 69900,
    cost: 21000,
    activeAds: 128,
    competitors: 54,
    keywords: ["termo", "botella", "regalo", "oficina"],
    series: buildSeries(3, 81, "steady"),
    whyIntro:
      "En Colombia la búsqueda de “termo inteligente” crece de forma sostenida en Google y aparece en el top de regalos corporativos. Es un producto de búsqueda activa, no solo de impulso.",
    whyPoints: [
      "Demanda estable todo el año, con picos en temporada de regalos.",
      "Ideal para personalizar con logo y vender a empresas.",
      "Bajo índice de devoluciones.",
    ],
  },
  {
    id: "lampara-luna",
    name: "Lámpara Luna 3D Levitante",
    category: "Decoración",
    country: "UY",
    sources: ["tiktok", "instagram"],
    trend: 77,
    growth7d: 22,
    image: lamparaLuna,
    price: 2490,
    cost: 820,
    activeAds: 96,
    competitors: 19,
    keywords: ["lámpara", "luna", "decoración", "regalo"],
    series: buildSeries(4, 77, "rising"),
    whyIntro:
      "Un producto altamente visual que funciona solo en video: la luna flotando genera el efecto ‘wow’ en los primeros 2 segundos. En Uruguay casi no hay vendedores con stock, la mayoría importa a pedido.",
    whyPoints: [
      "Excelente para campañas de regalos (Día de la Madre, Navidad).",
      "Muy poca competencia local.",
      "Precio percibido mucho mayor que el costo.",
    ],
  },
  {
    id: "masajeador-facial",
    name: "Masajeador Facial Gua Sha Eléctrico",
    category: "Belleza",
    country: "MX",
    sources: ["tiktok", "instagram", "google"],
    trend: 92,
    growth7d: 41,
    image: masajeadorFacial,
    price: 459,
    cost: 120,
    activeAds: 418,
    competitors: 63,
    keywords: ["gua sha", "skincare", "facial", "cuarzo rosa"],
    series: buildSeries(5, 92, "spike"),
    whyIntro:
      "El skincare es la categoría más viral de TikTok México. La versión eléctrica del gua sha combina una tendencia ya conocida con un upgrade tecnológico, ideal para rutinas ‘get ready with me’.",
    whyPoints: [
      "Fuerte en 3 plataformas a la vez: señal de demanda real.",
      "Margen cercano al 74%.",
      "Público femenino 18–34 muy activo en compras online.",
    ],
  },
  {
    id: "cepillo-alisador",
    name: "Cepillo Alisador Iónico Cerámico",
    category: "Belleza",
    country: "CO",
    sources: ["tiktok", "mercadolibre"],
    trend: 87,
    growth7d: 27,
    image: cepilloAlisador,
    price: 119900,
    cost: 38000,
    activeAds: 265,
    competitors: 47,
    keywords: ["alisador", "cabello", "plancha", "iónico"],
    series: buildSeries(6, 87, "rising"),
    whyIntro:
      "El clima húmedo de Barranquilla, Cali y Medellín hace del frizz un problema diario. Los videos de transformación en 5 minutos tienen altísima retención y el producto ya está validado en los más vendidos de Mercado Libre.",
    whyPoints: [
      "Resultado visible en video en segundos.",
      "Validado en ventas reales de Mercado Libre Colombia.",
      "Ahorra tiempo frente a la plancha tradicional.",
    ],
  },
  {
    id: "organizador-maquillaje",
    name: "Organizador de Maquillaje Giratorio 360°",
    category: "Belleza",
    country: "AR",
    sources: ["instagram", "mercadolibre"],
    trend: 73,
    growth7d: 12,
    image: organizadorMaquillaje,
    price: 38900,
    cost: 11500,
    activeAds: 74,
    competitors: 41,
    keywords: ["organizador", "maquillaje", "tocador", "acrílico"],
    series: buildSeries(7, 73, "steady"),
    whyIntro:
      "En Argentina los Reels de ‘organización estética’ del tocador tienen un público fiel. El producto gira bien en Mercado Libre con buena reputación, aunque la competencia empieza a crecer.",
    whyPoints: [
      "Compra recurrente para regalo.",
      "Fácil de fotografiar y mostrar lleno.",
      "Conviene diferenciarse con packs o colores exclusivos.",
    ],
  },
  {
    id: "comedero-automatico",
    name: "Comedero Automático con Cámara para Mascotas",
    category: "Mascotas",
    country: "CL",
    sources: ["google", "mercadolibre"],
    trend: 68,
    growth7d: 9,
    image: comederoAutomatico,
    price: 89990,
    cost: 34000,
    activeAds: 52,
    competitors: 22,
    keywords: ["comedero", "mascotas", "perro", "gato", "wifi"],
    series: buildSeries(8, 68, "steady"),
    whyIntro:
      "Chile tiene una de las tasas de tenencia de mascotas más altas de la región y un consumidor dispuesto a pagar por tecnología. Es un producto de búsqueda en Google más que de impulso en redes.",
    whyPoints: [
      "Ticket alto y cliente leal.",
      "Ideal para campañas en Google Shopping.",
      "Oportunidad de venta cruzada con accesorios.",
    ],
  },
  {
    id: "licuadora-portatil",
    name: "Licuadora Portátil USB Recargable",
    category: "Cocina",
    country: "BR",
    sources: ["tiktok", "instagram", "google"],
    trend: 84,
    growth7d: 25,
    image: licuadoraPortatil,
    price: 149,
    cost: 42,
    activeAds: 389,
    competitors: 88,
    keywords: ["licuadora", "smoothie", "fitness", "usb"],
    series: buildSeries(9, 84, "rising"),
    whyIntro:
      "El público fitness brasileño adoptó la licuadora portátil como accesorio de gimnasio. El volumen es enorme, aunque la competencia también: hay que entrar con buen creativo y precio agresivo.",
    whyPoints: [
      "Mercado más grande de la región.",
      "Tendencia fitness y vida saludable en alza.",
      "Alta competencia: diferenciar con bundles.",
    ],
  },
  {
    id: "quitapelusas",
    name: "Rodillo Quitapelusas Reutilizable para Mascotas",
    category: "Mascotas",
    country: "UY",
    sources: ["tiktok", "mercadolibre", "google"],
    trend: 79,
    growth7d: 19,
    image: quitapelusas,
    price: 890,
    cost: 210,
    activeAds: 118,
    competitors: 26,
    keywords: ["pelos", "mascotas", "sillón", "limpieza"],
    series: buildSeries(10, 79, "rising"),
    whyIntro:
      "Los videos ‘satisfying’ de quitar pelo de perro del sillón tienen millones de vistas. En Uruguay es un producto barato, de compra impulsiva y con muy buena reputación en Mercado Libre.",
    whyPoints: [
      "Precio bajo: conversión rápida sin mucha fricción.",
      "Contenido satisfactorio que se comparte solo.",
      "Margen superior al 75%.",
    ],
  },
  {
    id: "auriculares-oseos",
    name: "Auriculares de Conducción Ósea Deportivos",
    category: "Deportes",
    country: "MX",
    sources: ["google", "mercadolibre"],
    trend: 71,
    growth7d: 14,
    image: auricularesOseos,
    price: 899,
    cost: 310,
    activeAds: 88,
    competitors: 34,
    keywords: ["auriculares", "running", "ciclismo", "bluetooth"],
    series: buildSeries(11, 71, "steady"),
    whyIntro:
      "Corredores y ciclistas mexicanos buscan escuchar música sin perder el sonido del tráfico. La categoría crece de forma constante en Google y Mercado Libre, con clientes que comparan antes de comprar.",
    whyPoints: [
      "Nicho con cliente informado y fiel.",
      "Funciona con alianzas con clubes de running.",
      "Buena reseña = ventas sostenidas.",
    ],
  },
  {
    id: "tira-led",
    name: "Tira LED RGB con App y Control por Voz",
    category: "Gaming",
    country: "CO",
    sources: ["tiktok", "google"],
    trend: 86,
    growth7d: 33,
    image: tiraLed,
    price: 59900,
    cost: 16000,
    activeAds: 301,
    competitors: 59,
    keywords: ["led", "rgb", "setup", "gamer", "habitación"],
    series: buildSeries(12, 86, "spike"),
    whyIntro:
      "Los ‘room tours’ y setups gamer son tendencia entre adolescentes colombianos. La tira LED es la puerta de entrada más barata para transformar una habitación y luce espectacular en video.",
    whyPoints: [
      "Ticket accesible para público joven.",
      "Muy compartible: transformación de habitación.",
      "Ideal para upsell de kits y paneles hexagonales.",
    ],
  },
];

export interface ProductFilters {
  country: CountryCode | "ALL";
  sources: SourceId[];
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
 * de ellas) y por palabra clave en nombre, categoría o keywords. Ordena por tendencia.
 */
export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const q = normalize(filters.query.trim());
  return products
    .filter((p) => filters.country === "ALL" || p.country === filters.country)
    .filter((p) => p.sources.some((s) => filters.sources.includes(s)))
    .filter((p) => {
      if (!q) return true;
      const haystack = normalize([p.name, p.category, ...p.keywords].join(" "));
      return haystack.includes(q);
    })
    .sort((a, b) => b.trend - a.trend);
}

export function formatPrice(value: number, country: CountryCode) {
  return `${COUNTRIES[country].currency} ${value.toLocaleString("es-UY")}`;
}

export function marginPercent(p: Product) {
  return Math.round(((p.price - p.cost) / p.price) * 100);
}

export function tiktokSearchUrl(p: Product) {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(p.keywords[0] + " " + p.category)}`;
}

export function mercadoLibreSearchUrl(p: Product) {
  const slug = encodeURIComponent(p.keywords.slice(0, 2).join("-").replace(/\s+/g, "-"));
  return `https://${COUNTRIES[p.country].mlDomain}/${slug}`;
}
