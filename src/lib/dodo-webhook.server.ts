import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CHECKOUT_USER_METADATA_KEY, decidePlanChange, planForEvent } from "./billing";

export interface DodoEvent {
  type: string;
  data: {
    subscription_id?: string | null | undefined;
    status?: string | null | undefined;
    customer?: { customer_id?: string | null | undefined; email?: string | null | undefined } | null | undefined;
    metadata?: Record<string, unknown> | null | undefined;
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileMatch = { id: string; dodo_subscription_id: string | null };

async function findProfile(userId: string | null, customerId: string | null, email: string | null) {
  const cols = "id, dodo_subscription_id";
  if (userId && UUID.test(userId)) {
    const { data } = await supabaseAdmin.from("profiles").select(cols).eq("id", userId).maybeSingle();
    if (data) return data as ProfileMatch;
  }
  if (customerId) {
    const { data } = await supabaseAdmin.from("profiles").select(cols).eq("dodo_customer_id", customerId).limit(1).maybeSingle();
    if (data) return data as ProfileMatch;
  }
  if (email) {
    const { data } = await supabaseAdmin.from("profiles").select(cols).eq("email", email.toLowerCase()).limit(1).maybeSingle();
    if (data) return data as ProfileMatch;
  }
  return null;
}

/** Aplica un evento ya verificado. Idempotente por webhook-id. */
export async function processDodoEvent(webhookId: string, event: DodoEvent): Promise<string> {
  if (!planForEvent(event.type)) return "ignored";

  const { data: seen } = await supabaseAdmin.from("payment_events").select("webhook_id").eq("webhook_id", webhookId).maybeSingle();
  if (seen) return "duplicate";

  const d = event.data ?? {};
  const subscriptionId = d.subscription_id ?? null;
  const customerId = d.customer?.customer_id ?? null;
  const email = d.customer?.email ?? null;
  const rawUserId = d.metadata?.[CHECKOUT_USER_METADATA_KEY];
  const userId = typeof rawUserId === "string" ? rawUserId : null;

  const profile = await findProfile(userId, customerId, email);
  if (!profile) {
    console.warn(`[dodo] ${event.type}: no account matches subscription ${subscriptionId}`);
    return "no-account";
  }

  const decision = decidePlanChange(event.type, profile.dodo_subscription_id, subscriptionId);
  if (decision !== "ignore") {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: decision,
        subscription_status: d.status ?? event.type.replace("subscription.", ""),
        plan_updated_at: new Date().toISOString(),
        ...(subscriptionId ? { dodo_subscription_id: subscriptionId } : {}),
        ...(customerId ? { dodo_customer_id: customerId } : {}),
      })
      .eq("id", profile.id);
    if (error) throw error;
  }

  await supabaseAdmin.from("payment_events").insert({
    webhook_id: webhookId,
    event_type: event.type,
    subscription_id: subscriptionId,
    user_id: profile.id,
  });
  return decision === "ignore" ? "ignored-old-subscription" : `plan:${decision}`;
}
