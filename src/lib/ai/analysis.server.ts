import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, jsonSchema, streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export interface GeneratedAnalysis {
  resumen: string;
  puntos: string[];
  palabras_clave: string[];
}

export type AnalysisResult = { ok: true; analysis: GeneratedAnalysis } | { ok: false; error: string };

const schema = jsonSchema<GeneratedAnalysis>({
  type: "object",
  additionalProperties: false,
  required: ["resumen", "puntos", "palabras_clave"],
  properties: {
    resumen: { type: "string", description: "Párrafo de 2 a 3 frases" },
    puntos: { type: "array", items: { type: "string" }, description: "Exactamente 3 razones breves" },
    palabras_clave: { type: "array", items: { type: "string" }, description: "4 o 5 palabras clave de búsqueda" },
  },
});

const INSTRUCTIONS = `Eres analista de e-commerce y dropshipping en Latinoamérica para la app TrendLatam AI.
Explicas en español neutro, claro y concreto, por qué un producto es ganador en un país específico.
Considera la cultura de compra local, clima, estacionalidad, competencia en Mercado Libre y el tipo de contenido que funciona en TikTok e Instagram en ese país.
"resumen": 2 o 3 frases (máximo 60 palabras), mencionando el país.
"puntos": exactamente 3 razones cortas (máximo 14 palabras cada una), accionables para un vendedor.
"palabras_clave": 4 o 5 términos en minúsculas que la gente buscaría.
No inventes cifras exactas de ventas ni cites fuentes.`;

export async function generateProductAnalysis(
  input: { nombre: string; pais: string; categoria: string | null },
  abortSignal?: AbortSignal,
): Promise<AnalysisResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "La IA no está configurada todavía." };

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const prompt = `Producto: ${input.nombre}\nPaís: ${input.pais}${input.categoria ? `\nCategoría: ${input.categoria}` : ""}`;

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: INSTRUCTIONS,
      messages: [{ role: "user", content: prompt }],
      output: Output.object({ schema }),
      ...(abortSignal ? { abortSignal } : {}),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const out = await result.output;
    const clean = (arr: unknown) =>
      (Array.isArray(arr) ? arr : []).filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
    const resumen = typeof out?.resumen === "string" ? out.resumen.trim() : "";
    if (!resumen) return { ok: false, error: "La IA no devolvió un análisis. Intenta de nuevo." };
    return {
      ok: true,
      analysis: {
        resumen,
        puntos: clean(out.puntos).slice(0, 3),
        palabras_clave: clean(out.palabras_clave).map((k) => k.toLowerCase()).slice(0, 5),
      },
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, error: "La IA no devolvió un análisis válido. Intenta de nuevo." };
    }
    if (APICallError.isInstance(error)) {
      console.error("AI gateway error", error.statusCode, error.responseBody);
      if (error.statusCode === 402) return { ok: false, error: "Se agotaron los créditos de IA del espacio de trabajo. Agrega créditos para seguir generando." };
      if (error.statusCode === 429) return { ok: false, error: "Demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo." };
      if (error.statusCode === 403) return { ok: false, error: "El uso de IA está bloqueado para este espacio de trabajo." };
    }
    console.error("AI analysis failed", error);
    return { ok: false, error: "No pudimos generar el análisis ahora. Intenta de nuevo en unos minutos." };
  }
}
