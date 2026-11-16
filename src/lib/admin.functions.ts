import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Redacta con IA por qué un producto es ganador en un país. Solo administradores. */
export const generateAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nombre: string; pais: string; categoria: string | null }) => {
    const nombre = String(input?.nombre ?? "").trim().slice(0, 160);
    const pais = String(input?.pais ?? "").trim().slice(0, 40);
    const categoria = input?.categoria ? String(input.categoria).trim().slice(0, 60) : null;
    if (!nombre || !pais) throw new Error("Escribe el nombre del producto y elige el país.");
    return { nombre, pais, categoria };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false as const, error: "Solo los administradores pueden usar esta función." };
    const { generateProductAnalysis } = await import("./ai/analysis.server");
    return generateProductAnalysis(data);
  });
