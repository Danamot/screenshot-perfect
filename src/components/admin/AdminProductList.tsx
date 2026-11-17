import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SaturationBadge } from "@/components/dashboard/SaturationBadge";
import { deleteProduct, type AdminProductRow } from "@/lib/admin";
import { COUNTRIES, SATURATION_ORDER, formatPrice, type CountryCode, type SaturationLevel } from "@/lib/products";
import { cn } from "@/lib/utils";

export function AdminProductList({
  products,
  editingId,
  onEdit,
}: {
  products: AdminProductRow[];
  editingId: string | null;
  onEdit: (p: AdminProductRow | null) => void;
}) {
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<AdminProductRow | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async (_d, id) => {
      toast.success("Producto eliminado");
      setToDelete(null);
      if (id === editingId) onEdit(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-products"] }),
      ]);
    },
    onError: () => toast.error("No se pudo eliminar el producto."),
  });

  return (
    <section aria-label="Productos actuales" className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold">Productos actuales</h2>
        <span className="font-mono text-xs text-muted-foreground">{products.length} en total</span>
      </div>

      {products.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Todavía no hay productos.</p>
      ) : (
        <ul className="divide-y divide-border">
          {products.map((p) => {
            const country = COUNTRIES[(p.pais in COUNTRIES ? p.pais : "UY") as CountryCode];
            const sat = (SATURATION_ORDER as string[]).includes(p.saturacion) ? (p.saturacion as SaturationLevel) : "media";
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 transition-colors",
                  editingId === p.id && "bg-primary/10",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-elevated">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.nombre}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {country.flag} {country.name}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{p.categoria}</span>
                    <span aria-hidden>·</span>
                    <span className="font-mono">{formatPrice(Number(p.precio_estimado), p.pais as CountryCode)}</span>
                    <span className="font-mono text-success">{p.margen}%</span>
                    <SaturationBadge level={sat} />
                    <span className="font-mono">Viralidad {p.viralidad}</span>
                    {!p.analisis_ia && <span className="text-warning">Sin análisis</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="surface" size="icon" aria-label={`Editar ${p.nombre}`} onClick={() => onEdit(p)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="surface"
                    size="icon"
                    aria-label={`Eliminar ${p.nombre}`}
                    className="hover:border-destructive/50 hover:text-destructive"
                    onClick={() => setToDelete(p)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !remove.isPending && setToDelete(null)}>
        <AlertDialogContent className="border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{toDelete?.nombre}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Desaparecerá del dashboard para todos los usuarios. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) remove.mutate(toDelete.id);
              }}
            >
              {remove.isPending && <Loader2 className="animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
