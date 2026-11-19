import { createFileRoute } from "@tanstack/react-router";
import { apiKeyMatches, parseMakeProduct } from "@/lib/make-import";

export const Route = createFileRoute("/api/public/make-products")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["MAKE_WEBHOOK_SECRET"];
        if (!secret) return Response.json({ ok: false, error: "Falta configurar MAKE_WEBHOOK_SECRET." }, { status: 500 });
        if (!apiKeyMatches(request.headers.get("x-api-key"), secret)) {
          return Response.json({ ok: false, error: "Clave x-api-key incorrecta." }, { status: 401 });
        }

        const text = await request.text();
        if (text.length > 100_000) return Response.json({ ok: false, error: "Datos demasiado grandes." }, { status: 413 });
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          return Response.json({ ok: false, error: "El cuerpo no es un JSON válido." }, { status: 400 });
        }

        const parsed = parseMakeProduct(json);
        if (!parsed.ok) return Response.json({ ok: false, errors: parsed.errors }, { status: 400 });

        try {
          const { upsertMakeProduct } = await import("@/lib/make-import.server");
          const result = await upsertMakeProduct(parsed.product);
          return Response.json({ ok: true, ...result, nombre: parsed.product.nombre, pais: parsed.product.pais });
        } catch (err) {
          console.error("[make-products]", err);
          return Response.json({ ok: false, error: "No se pudo guardar el producto." }, { status: 500 });
        }
      },
    },
  },
});
