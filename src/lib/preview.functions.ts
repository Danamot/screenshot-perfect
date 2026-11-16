import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Top 3 público de la portada (sin análisis de IA). */
export const getLandingPreview = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.rpc("get_landing_preview");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    slug: r.slug,
    nombre: r.nombre,
    pais: r.pais,
    precio: Number(r.precio_estimado),
    margen: r.margen,
    saturacion: r.saturacion,
    viralidad: r.viralidad,
    imagen: r.imagen_url ?? "",
  }));
});
