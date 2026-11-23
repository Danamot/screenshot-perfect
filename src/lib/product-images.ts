import { supabase } from "@/integrations/supabase/client";
import { bucketPathOf, PHOTO_BUCKET } from "@/lib/photo-paths";

/** Cuánto dura un enlace temporal de foto, en segundos. */
const SIGNED_URL_TTL = 3600;

/** Pide enlaces temporales para varias rutas a la vez. Si algo falla, devuelve un mapa vacío. */
async function signPhotoPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return new Map();
  const signed = new Map<string, string>();
  unique.forEach((path, i) => {
    const entry = data[i];
    if (entry?.signedUrl) signed.set(path, entry.signedUrl);
  });
  return signed;
}

/** Enlace temporal para una sola foto; devuelve la misma imagen si no vive en el bucket. */
export async function signedPhotoUrl(image: string | null | undefined): Promise<string> {
  const value = (image ?? "").trim();
  const path = bucketPathOf(value);
  if (!path) return value;
  const signed = await signPhotoPaths([path]);
  return signed.get(path) ?? value;
}

/**
 * Sustituye las fotos del bucket por enlaces temporales. Las fotos de la app y las
 * direcciones externas quedan intactas.
 */
export async function withSignedPhotos<T extends { image: string }>(items: T[]): Promise<T[]> {
  const paths = items.map((item) => bucketPathOf(item.image)).filter((p): p is string => p !== null);
  if (paths.length === 0) return items;
  const signed = await signPhotoPaths(paths);
  if (signed.size === 0) return items;
  return items.map((item) => {
    const path = bucketPathOf(item.image);
    const url = path ? signed.get(path) : undefined;
    return url ? { ...item, image: url } : item;
  });
}

/** Igual que `withSignedPhotos`, pero sobre filas de la base de datos. */
export async function withSignedRowPhotos<T extends { imagen_url: string | null }>(rows: T[]): Promise<T[]> {
  const paths = rows.map((row) => bucketPathOf(row.imagen_url)).filter((p): p is string => p !== null);
  if (paths.length === 0) return rows;
  const signed = await signPhotoPaths(paths);
  if (signed.size === 0) return rows;
  return rows.map((row) => {
    const path = bucketPathOf(row.imagen_url);
    const url = path ? signed.get(path) : undefined;
    return url ? { ...row, imagen_url: url } : row;
  });
}

/**
 * Sube una foto al bucket y devuelve la ruta que se guarda en el producto.
 * El archivo queda privado: solo se abre con un enlace temporal.
 */
export async function uploadProductPhoto(file: File): Promise<string> {
  const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  const ext = clean.includes(".") ? clean.slice(clean.lastIndexOf(".")) : ".jpg";
  const stem = clean.slice(0, Math.max(1, clean.length - ext.length)).slice(0, 40) || "foto";
  const path = `${Date.now().toString(36)}-${stem}${ext}`;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
  return `${PHOTO_BUCKET}/${path}`;
}
