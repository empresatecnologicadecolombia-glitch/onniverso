import { ONNI_PERSONALITY } from "@/data/onniBrain";
import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type OnniGeminiRequest = {
  message: string;
  contextPath: string;
};

export type OnniGeminiResponse = {
  answer: string;
  model?: string;
};

async function invokeOnniGeminiEdge(body: OnniGeminiRequest): Promise<OnniGeminiResponse> {
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("onni-gemini", {
    body,
  });

  if (!fnError && invokedData && typeof invokedData === "object") {
    const answer = String((invokedData as { answer?: string }).answer ?? "").trim();
    if (answer) return { answer, model: (invokedData as { model?: string }).model };
    const backendError = String((invokedData as { error?: string }).error ?? "").trim();
    if (backendError) throw new Error(backendError);
  }

  const response = await fetch(`${supabasePublicUrl}/functions/v1/onni-gemini`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseJson = (await response.json()) as OnniGeminiResponse & { error?: string };
  if (!response.ok) {
    throw new Error(responseJson.error || fnError?.message || "No se pudo consultar Gemini.");
  }
  const answer = String(responseJson.answer ?? "").trim();
  if (!answer) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer, model: responseJson.model };
}

export function buildOnniGeminiSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso. Estás impulsada por Google Gemini y SÍ estás conectada a esa IA.",
    "Si preguntan si usas Gemini o si estás conectada, responde afirmativamente (sí, uso Google Gemini).",
    "NUNCA digas que no estás conectada a Gemini ni que solo usas reglas.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso ofrece: lobby 3D, conciertos live, tienda, Coliseo 360°, aulas virtuales y educación inmersiva.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día; ofrece conciertos, el lobby y la guía de la app.",
    ONNI_PERSONALITY.tone,
    "Responde en español, breve (1–3 párrafos). No inventes URLs.",
    "Para navegar sugiere: «lobby», «conciertos», «educación», «ayuda», «¿dónde estoy?».",
  ].join(" ");
}

/** Solo desarrollo local si VITE_GEMINI_API_KEY está en .env.local (no usar en producción). */
async function askOnniGeminiDevDirect(body: OnniGeminiRequest, apiKey: string): Promise<OnniGeminiResponse> {
  const model = "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildOnniGeminiSystemPrompt(body.contextPath) }] },
        contents: [{ role: "user", parts: [{ text: body.message }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.65 },
      }),
    },
  );
  const json = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!response.ok) {
    throw new Error(json.error?.message || `Gemini error (${response.status})`);
  }
  const answer =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!answer) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer, model };
}

/** Consulta Gemini vía Edge Function (producción). En dev, fallback opcional con VITE_GEMINI_API_KEY. */
export async function askOnniGemini(body: OnniGeminiRequest): Promise<string | null> {
  const message = body.message.trim();
  if (!message) return null;

  try {
    const result = await invokeOnniGeminiEdge({ message, contextPath: body.contextPath });
    return result.answer;
  } catch (edgeError) {
    const devKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
    if (import.meta.env.DEV && devKey) {
      try {
        const result = await askOnniGeminiDevDirect({ message, contextPath: body.contextPath }, devKey);
        return result.answer;
      } catch (devError) {
        console.warn("[Onni Gemini dev]", devError);
      }
    }
    console.warn("[Onni Gemini]", edgeError);
    return null;
  }
}

export function isOnniNavigationResult(result: {
  navigateTo?: string;
  navigateBack?: boolean;
  command?: unknown;
}): boolean {
  return Boolean(result.navigateTo || result.navigateBack || result.command);
}
