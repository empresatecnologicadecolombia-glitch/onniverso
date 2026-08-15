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
    "Respondes ÚNICAMENTE con el cerebro LOCAL instalado en el PC (archivo onni-cerebro-v1.gguf + llama.cpp).",
    "PROHIBIDO decir que eres Gemini, ChatGPT, Google, OpenAI o cualquier IA en la nube.",
    "Si preguntan qué cerebro/modelo/IA usas, responde exactamente en una frase: uso el cerebro local de OnniVers PC (onni-cerebro-v1), no Gemini.",
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
 * Pregunta al cerebro local con streaming. Devuelve null si falla.
 * En .exe: IPC Electron primero; si falla, HTTP directo a llama-server (127.0.0.1:8765).
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

    const viaIpc = await askOnniElectronBrain(
      {
        requestId,
        messages: buildBrainMessages(body),
      },
      onPartial,
    );
    if (viaIpc) return viaIpc;

    // Fallback: el server local a veces ya está vivo aunque el IPC falle.
    const viaHttp = await askLlamaHttpDirect(buildBrainMessages(body), onPartial);
    return viaHttp;
  } finally {
    window.clearTimeout(timer);
  }
}

async function askLlamaHttpDirect(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  onPartial?: (accumulatedText: string) => void,
): Promise<string | null> {
  try {
    const response = await fetch("http://127.0.0.1:8765/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "onni-cerebro",
        messages,
        stream: false,
        temperature: 0.45,
        max_tokens: 128,
      }),
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = String(json?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return null;
    onPartial?.(text);
    console.info("[Onni cerebro] http-local", text.slice(0, 80));
    return text;
  } catch (error) {
    console.warn("[Onni cerebro] http-local falló", error);
    return null;
  }
}
