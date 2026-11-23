import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rowToProduct, type CountryCode } from "@/lib/products";
import { withSignedPhotos } from "@/lib/product-images";
import type { PlanId } from "@/lib/plans";

export interface Account {
  id: string;
  nombre: string;
  email: string;
  plan: PlanId;
  pais: CountryCode | null;
  isAdmin: boolean;
}

export const accountQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["account", userId],
    queryFn: async (): Promise<Account> => {
      const [{ data: profile, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, nombre, email, plan, pais").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (error) throw error;
      return {
        id: userId,
        nombre: profile?.nombre ?? "",
        email: profile?.email ?? "",
        plan: profile?.plan === "pro" ? "pro" : "free",
        pais: (profile?.pais as CountryCode | null) ?? null,
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });

/** Productos que el plan del usuario permite ver (la base de datos aplica el límite). */
export const dashboardProductsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["dashboard-products", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_products");
      if (error) throw error;
      return withSignedPhotos((data ?? []).map(rowToProduct));
    },
  });

export async function setMyCountry(pais: CountryCode) {
  const { error } = await supabase.rpc("set_my_country", { _pais: pais });
  if (error) throw error;
}
