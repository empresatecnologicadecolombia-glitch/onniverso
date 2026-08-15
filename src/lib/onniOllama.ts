import { ONNI_CONVERSATION_STYLE, ONNI_PERSONALITY } from "@/data/onniBrain";
import { isElectronDesktopApp } from "@/lib/deviceDetection";
import {
  askOnniElectronBrain,
  isOnniElectronBrainAvailable,
} from "@/lib/onniElectronBrain";
import type { OnniChatTurn } from "@/lib/onniChatMemory";

/**
 * Cerebro local de Onni en OnniVers PC (.exe) — llama.cpp embebido.
 * Sin Ollama externo. Web/Chrome/Android siguen con Gemini.
 */

const GENERATION_TIMEOUT_MS = 90_000;

export type OnniOllamaRequest = {
  message: string;
  contextPath: string;
  history?: OnniChatTurn[];
};

function buildOnniBrainSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso.",
    "Respondes ÚNICAMENTE con el cerebro LOCAL instalado en el PC del usuario (onni-cerebro / llama.cpp).",
    "NO eres Google Gemini. NO usas IA en la nube. NUNCA digas que estás impulsada por Gemini, ChatGPT u otra IA externa.",
    "Si te preguntan qué modelo o cerebro usas, responde claramente: cerebro local de OnniVers PC (onni-cerebro-v1).",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    ONNI_PERSONALITY.tone,
    ONNI_CONVERSATION_STYLE,
    "No inventes URLs.",
    "NUNCA listes lobby, videos educativos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
  ].join(" ");
}

function buildBrainMessages(body: OnniOllamaRequest) {
  return [
    { role: "system" as const, content: buildOnniBrainSystemPrompt(body.contextPath) },
    ...(body.history ?? []).map((turn) => ({
      role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: turn.text,
    })),
    { role: "user" as const, content: body.message.trim() },
  ];
}

/** True si el .exe tiene el cerebro embebido listo (onni-cerebro-v1.gguf + llama-server). */
export async function isOnniOllamaAvailable(): Promise<boolean> {
  if (!isElectronDesktopApp()) return false;
  return isOnniElectronBrainAvailable();
}

/**
 * Pregunta al cerebro local con streaming. Devuelve null si falla
 * (fallback a Gemini en el flujo del asistente).
 */
export async function askOnniOllama(
  body: OnniOllamaRequest,
  onPartial?: (accumulatedText: string) => void,
): Promise<string | null> {
  const message = body.message.trim();
  if (!message) return null;
  if (!(await isOnniOllamaAvailable())) return null;

  const timer = window.setTimeout(() => {
    console.warn("[Onni cerebro] timeout de generación");
  }, GENERATION_TIMEOUT_MS);

  try {
    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `onni-${Date.now()}`;

    return await askOnniElectronBrain(
      {
        requestId,
        messages: buildBrainMessages(body),
      },
      onPartial,
    );
  } finally {
    window.clearTimeout(timer);
  }
}
