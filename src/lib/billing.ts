/** Suscripción del Plan Pro con Dodo Payments (enlace de pago estático). */

/** Enlace de pago del Plan Pro. Es público: no contiene claves. */
export const DODO_PRO_PAYMENT_LINK = "https://test.checkout.dodopayments.com/buy/pdt_0NsAijX9EH6dVcD9HIsWC?quantity=1";

/** Campo de metadata donde viaja el ID del usuario hasta el webhook. */
export const CHECKOUT_USER_METADATA_KEY = "user_id";

export function buildCheckoutUrl(
  link: string,
  opts: { userId: string; email?: string | null | undefined; redirectUrl: string },
): string {
  const url = new URL(link);
  url.searchParams.set(`metadata_${CHECKOUT_USER_METADATA_KEY}`, opts.userId);
  if (opts.email) {
    url.searchParams.set("email", opts.email);
    url.searchParams.set("disableEmail", "true");
  }
  url.searchParams.set("redirect_url", opts.redirectUrl);
  return url.toString();
}

/** Eventos de Dodo que activan o quitan el Plan Pro. */
const ACTIVATING = new Set(["subscription.active", "subscription.renewed"]);
const DEACTIVATING = new Set(["subscription.cancelled", "subscription.expired"]);

export function planForEvent(type: string): "pro" | "free" | null {
  if (ACTIVATING.has(type)) return "pro";
  if (DEACTIVATING.has(type)) return "free";
  return null;
}

/**
 * Qué hacer con la cuenta ante un evento.
 * Una cancelación de una suscripción vieja no quita el Pro de una suscripción más nueva.
 */
export function decidePlanChange(
  type: string,
  currentSubscriptionId: string | null,
  eventSubscriptionId: string | null,
): "pro" | "free" | "ignore" {
  const plan = planForEvent(type);
  if (!plan) return "ignore";
  if (plan === "free" && currentSubscriptionId && eventSubscriptionId && currentSubscriptionId !== eventSubscriptionId) {
    return "ignore";
  }
  return plan;
}
