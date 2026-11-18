import { describe, expect, it } from "vitest";
import { DODO_PRO_PAYMENT_LINK, buildCheckoutUrl, decidePlanChange, planForEvent } from "./billing";
import { signDodoPayload, verifyDodoSignature } from "./dodo-webhook";

describe("checkout del Plan Pro", () => {
  it("pasa el ID del usuario como metadata, prellena el email y vuelve al dashboard", () => {
    const url = new URL(
      buildCheckoutUrl(DODO_PRO_PAYMENT_LINK, {
        userId: "0268c33c-b6dc-4a8b-a9e8-9db4653b8f4b",
        email: "ana@tienda.uy",
        redirectUrl: "https://trendlatam-ai.lovable.app/explorar?pago=ok",
      }),
    );
    expect(url.pathname).toBe("/buy/pdt_0NsAijX9EH6dVcD9HIsWC");
    expect(url.searchParams.get("quantity")).toBe("1");
    expect(url.searchParams.get("metadata_user_id")).toBe("0268c33c-b6dc-4a8b-a9e8-9db4653b8f4b");
    expect(url.searchParams.get("email")).toBe("ana@tienda.uy");
    expect(url.searchParams.get("redirect_url")).toBe("https://trendlatam-ai.lovable.app/explorar?pago=ok");
  });
});

describe("eventos de suscripción", () => {
  it("subscription.active pasa la cuenta a pro", () => {
    expect(planForEvent("subscription.active")).toBe("pro");
  });
  it("subscription.cancelled vuelve la cuenta a free", () => {
    expect(planForEvent("subscription.cancelled")).toBe("free");
  });
  it("subscription.expired vuelve la cuenta a free", () => {
    expect(planForEvent("subscription.expired")).toBe("free");
  });
  it("otros eventos no cambian el plan", () => {
    expect(planForEvent("payment.succeeded")).toBeNull();
  });
  it("cancelar una suscripción vieja no quita el Pro de la nueva", () => {
    expect(decidePlanChange("subscription.cancelled", "sub_nueva", "sub_vieja")).toBe("ignore");
    expect(decidePlanChange("subscription.cancelled", "sub_nueva", "sub_nueva")).toBe("free");
  });
});

describe("firma del webhook", () => {
  const secret = "whsec_" + btoa("clave-de-prueba-de-32-bytes-1234");
  const body = JSON.stringify({ type: "subscription.active", data: {} });
  const now = 1_800_000_000;

  it("acepta una firma válida", async () => {
    const sig = await signDodoPayload(secret, "msg_1", String(now), body);
    expect(
      await verifyDodoSignature({ secret, id: "msg_1", timestamp: String(now), signatureHeader: `v1,${sig}`, body, nowSeconds: now }),
    ).toBe(true);
  });
  it("rechaza un cuerpo alterado", async () => {
    const sig = await signDodoPayload(secret, "msg_1", String(now), body);
    expect(
      await verifyDodoSignature({ secret, id: "msg_1", timestamp: String(now), signatureHeader: `v1,${sig}`, body: body + " ", nowSeconds: now }),
    ).toBe(false);
  });
  it("rechaza eventos de más de 5 minutos", async () => {
    const sig = await signDodoPayload(secret, "msg_1", String(now), body);
    expect(
      await verifyDodoSignature({ secret, id: "msg_1", timestamp: String(now), signatureHeader: `v1,${sig}`, body, nowSeconds: now + 301 }),
    ).toBe(false);
  });
});
