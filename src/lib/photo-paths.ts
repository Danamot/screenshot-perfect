/**
 * Rutas de fotos dentro del bucket privado de almacenamiento.
 *
 * Módulo sin cliente de navegador: pueden usarlo tanto la app como el código que
 * corre en el servidor.
 */

/** Bucket privado donde se guardan las fotos subidas desde el panel de administración. */
export const PHOTO_BUCKET = "producto-fotos";

/**
 * Ruta del objeto dentro del bucket si la imagen vive ahí.
 * Devuelve null para fotos de la app ("/products/…"), direcciones externas o vacío.
 */
export function bucketPathOf(image: string | null | undefined): string | null {
  const value = (image ?? "").trim();
  if (!value) return null;

  // Ruta guardada por el panel: "producto-fotos/abc-lampara.jpg"
  if (value.startsWith(`${PHOTO_BUCKET}/`)) return value.slice(PHOTO_BUCKET.length + 1) || null;

  // Dirección del bucket (pública, privada o ya firmada)
  if (!value.startsWith("http")) return null;
  const after = value.split("/object/")[1];
  if (!after) return null;
  const segments = (after.split("?")[0] ?? "").split("/");
  const at = segments.indexOf(PHOTO_BUCKET);
  if (at === -1) return null;
  return segments.slice(at + 1).join("/") || null;
}

/** true si la foto se sirve desde el bucket privado y necesita un enlace temporal. */
export function isBucketImage(image: string | null | undefined): boolean {
  return bucketPathOf(image) !== null;
}
