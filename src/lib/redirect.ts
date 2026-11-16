/** Solo acepta rutas internas ("/explorar"), nunca URLs externas. */
export function safeRedirect(value: unknown, fallback = "/explorar"): string {
  if (typeof value !== "string") return fallback;
  try {
    const url = new URL(value, "http://local");
    if (url.origin !== "http://local") {
      // href absoluto del mismo sitio: quedarse solo con la ruta
      if (typeof window !== "undefined" && url.origin === window.location.origin) return url.pathname + url.search;
      return fallback;
    }
  } catch {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/auth")) return fallback;
  return value;
}
