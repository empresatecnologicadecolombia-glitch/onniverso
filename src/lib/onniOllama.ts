import { ONNI_CONVERSATION_STYLE, ONNI_PERSONALITY } from "@/data/onniBrain";
import { isElectronDesktopApp } from "@/lib/deviceDetection";
import type { OnniChatTurn } from "@/lib/onniChatMemory";

/**
 * Cliente de Ollama local para Onni — SOLO en OnniVers PC (.exe).
 * Si Ollama no está corriendo o falla, devuelve null y el flujo
 * normal de Gemini sigue intacto (web/Chrome/Android no cambian).
 */

const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_MODEL = "gemma3:1b";
const AVAILABILITY_TTL_MS = 60_000;
const AVAILABILITY_TIMEOUT_MS = 1_500;
const GENERATION_TIMEOUT_MS = 90_000;

export type OnniOllamaRequest = {
  message: string;
  contextPath: string;
  history?: OnniChatTurn[];
};

let availabilityCache: { at: number; ok: boolean } | null = null;

function buildOnniOllamaSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso. Respondes desde una IA local instalada en el PC del usuario.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    ONNI_PERSONALITY.tone,
    ONNI_CONVERSATION_STYLE,
    "No inventes URLs.",
    "NUNCA listes lobby, videos educativos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
  ].join(" ");
}

/** True si estamos en el .exe y el servidor local de Ollama responde (cacheado 60 s). */
export async function isOnniOllamaAvailable(): Promise<boolean> {
  if (!isElectronDesktopApp()) return false;
  const now = Date.now();
  if (availabilityCache && now - availabilityCache.at < AVAILABILITY_TTL_MS) {
    return availabilityCache.ok;
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), AVAILABILITY_TIMEOUT_MS);
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
    window.clearTimeout(timer);
    availabilityCache = { at: now, ok: response.ok };
    return response.ok;
  } catch {
    availabilityCache = { at: now, ok: false };
    return false;
  }
}

/**
 * Pregunta al modelo local con streaming. `onPartial` recibe el texto
 * acumulado a medida que se genera. Devuelve la respuesta final o null
 * si Ollama no está disponible o falla (para hacer fallback a Gemini).
 */
export async function askOnniOllama(
  body: OnniOllamaRequest,
  onPartial?: (accumulatedText: string) => void,
): Promise<string | null> {
  const message = body.message.trim();
  if (!message) return null;
  if (!(await isOnniOllamaAvailable())) return null;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: true,
        messages: [
          { role: "system", content: buildOnniOllamaSystemPrompt(body.contextPath) },
          ...(body.history ?? []).map((turn) => ({
            role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: turn.text,
          })),
          { role: "user", content: message },
        ],
        options: { temperature: 0.65, num_predict: 256 },
        keep_alive: "30m",
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const raw = line.trim();
        if (!raw) continue;
        try {
          const chunk = JSON.parse(raw) as { message?: { content?: string } };
          const piece = chunk.message?.content ?? "";
          if (piece) {
            answer += piece;
            onPartial?.(answer);
          }
        } catch {
          /* línea NDJSON incompleta; se acumula en buffer */
        }
      }
    }

    const finalAnswer = answer.trim();
    return finalAnswer || null;
  } catch (error) {
    console.warn("[Onni Ollama]", error);
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
