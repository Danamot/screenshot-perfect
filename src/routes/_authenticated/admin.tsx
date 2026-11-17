import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { AdminProductList } from "@/components/admin/AdminProductList";
import { ProductFormPanel } from "@/components/admin/ProductFormPanel";
import { adminProductsQueryOptions, isCurrentUserAdmin, type AdminProductRow } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel de Administración — TrendLatam AI" },
      { name: "description", content: "Agrega, edita y elimina los productos ganadores de TrendLatam AI." },
      { property: "og:title", content: "Panel de Administración — TrendLatam AI" },
      { property: "og:description", content: "Gestión de productos ganadores de TrendLatam AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  // Solo para la interfaz: la base de datos y el servidor vuelven a verificar el rol de administrador.
  beforeLoad: async ({ context }) => {
    if (!(await isCurrentUserAdmin(context.user.id))) throw redirect({ to: "/explorar" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(adminProductsQueryOptions()),
  pendingComponent: () => (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
  component: AdminPanel,
});

function AdminPanel() {
  const { data: products } = useSuspenseQuery(adminProductsQueryOptions());
  const [editing, setEditing] = useState<AdminProductRow | null>(null);

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Solo administradores
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Panel de Administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo que guardes aquí se muestra de inmediato en “Explorar Productos”.
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <ProductFormPanel
            key={editing?.id ?? "new"}
            editing={editing}
            onDone={() => setEditing(null)}
          />
        </div>
        <AdminProductList
          products={products}
          editingId={editing?.id ?? null}
          onEdit={(p) => {
            setEditing(p);
            if (p) window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </main>
  );
}
