import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyDodoSignature } from "@/lib/dodo-webhook";

const EventSchema = z.object({
  type: z.string().min(1).max(100),
  data: z
    .object({
      subscription_id: z.string().max(200).nullish(),
      status: z.string().max(60).nullish(),
      customer: z.object({ customer_id: z.string().max(200).nullish(), email: z.string().max(320).nullish() }).passthrough().nullish(),
      metadata: z.record(z.unknown()).nullish(),
    })
    .passthrough(),
});

export const Route = createFileRoute("/api/public/dodo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["DODO_PAYMENTS_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 500 });

        const body = await request.text();
        const webhookId = request.headers.get("webhook-id");
        const valid = await verifyDodoSignature({
          secret,
          id: webhookId,
          timestamp: request.headers.get("webhook-timestamp"),
          signatureHeader: request.headers.get("webhook-signature"),
          body,
        });
        if (!valid || !webhookId) return new Response("Invalid signature", { status: 401 });

        let json: unknown;
        try {
          json = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = EventSchema.safeParse(json);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const { processDodoEvent } = await import("@/lib/dodo-webhook.server");
        const result = await processDodoEvent(webhookId, parsed.data);
        return Response.json({ received: true, result });
      },
    },
  },
});
