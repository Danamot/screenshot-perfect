import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { accountQueryOptions } from "@/lib/account";
import { DODO_PRO_PAYMENT_LINK, buildCheckoutUrl } from "@/lib/billing";

/** Abre el pago del Plan Pro en Dodo Payments con el usuario identificado. */
export function useProCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: account } = useQuery({ ...accountQueryOptions(user?.id ?? ""), enabled: !!user });

  return () => {
    if (!user) {
      toast("Crea tu cuenta o inicia sesión para suscribirte al Plan Pro");
      navigate({ to: "/auth", search: { redirect: "/precios", modo: "registro" } });
      return;
    }
    if (account && (account.plan === "pro" || account.isAdmin)) {
      toast.success("Ya tienes acceso completo al Plan Pro");
      return;
    }
    const url = buildCheckoutUrl(DODO_PRO_PAYMENT_LINK, {
      userId: user.id,
      email: user.email,
      redirectUrl: `${window.location.origin}/explorar?pago=ok`,
    });
    // Dentro de la vista previa (iframe) el pago se abre en otra pestaña.
    if (window.self !== window.top) window.open(url, "_blank", "noopener");
    else window.location.assign(url);
  };
}
