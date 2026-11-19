import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { insertRow, nextInterestSeries, productColumns, type MakeProduct } from "./make-import";

type Existing = { id: string; slug: string; interes_semanal: number[]; updated_at: string };

function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function findExisting(p: MakeProduct): Promise<Existing | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, slug, nombre, interes_semanal, updated_at")
    .eq("pais", p.pais)
    .ilike("nombre", escapeLike(p.nombre));
  if (error) throw error;
  const target = p.nombre.trim().toLowerCase();
  return (data ?? []).find((r) => r.nombre.trim().toLowerCase() === target) ?? null;
}

async function update(existing: Existing, p: MakeProduct) {
  const { error } = await supabaseAdmin
    .from("products")
    .update({
      ...productColumns(p),
      interes_semanal: nextInterestSeries(existing.interes_semanal, p.viralidad, new Date(existing.updated_at), new Date()),
    })
    .eq("id", existing.id);
  if (error) throw error;
  return { action: "updated" as const, id: existing.id, slug: existing.slug };
}

/** Crea el producto o, si ya existe con el mismo nombre y país, actualiza sus métricas. */
export async function upsertMakeProduct(p: MakeProduct) {
  const existing = await findExisting(p);
  if (existing) return update(existing, p);

  const row = insertRow(p, Math.random().toString(36).slice(2, 6));
  const { data, error } = await supabaseAdmin.from("products").insert(row).select("id, slug").single();
  if (!error) return { action: "created" as const, id: data.id, slug: data.slug };

  // Otro envío simultáneo lo creó primero: actualizarlo.
  if (error.code === "23505") {
    const again = await findExisting(p);
    if (again) return update(again, p);
  }
  throw error;
}
