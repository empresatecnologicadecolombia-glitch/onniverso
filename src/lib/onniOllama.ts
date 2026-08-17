import { isElectronDesktopApp } from "@/lib/deviceDetection";
import {
  minimalOnniBrainMessages,
  normalizeOnniBrainMessages,
} from "@/lib/onniBrainMessages";
import {
  askOnniElectronBrainDetailed,
  isOnniElectronBrainAvailable,
} from "@/lib/onniElectronBrain";
import type { OnniChatTurn } from "@/lib/onniChatMemory";

/**
 * Cerebro local de Onni en OnniVers PC (.exe) — llama.cpp embebido.
 */

const GENERATION_TIMEOUT_MS = 90_000;

export type OnniOllamaRequest = {
  message: string;
  contextPath: string;
  history?: OnniChatTurn[];
};

function buildOnniBrainSystemPrompt(contextPath: string): string {
  // Prompt corto: el modelo chico falla más con system prompts enormes.
  return [
    "Eres Onni, asistente de OnniVers PC.",
    "Usas SOLO el cerebro local onni-cerebro-v1 (llama.cpp). No eres Gemini ni ChatGPT.",
    "Responde en español, breve y claro (2 a 5 frases).",
    `Ruta actual del usuario: ${contextPath || "/"}.`,
    "No inventes menús ni URLs.",
  ].join(" ");
}

function buildBrainMessages(body: OnniOllamaRequest) {
  const current = body.message.trim();
  // messagesRef ya incluye el mensaje actual: no duplicarlo (causa HTTP 400 en llama).
  const history = (body.history ?? [])
    .filter((turn) => turn.text.trim())
    .filter((turn, idx, arr) => {
      const isLast = idx === arr.length - 1;
      if (!isLast) return true;
      return !(turn.role === "user" && turn.text.trim() === current);
    })
    .slice(-6);

  return normalizeOnniBrainMessages([
    { role: "system", content: buildOnniBrainSystemPrompt(body.contextPath) },
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: turn.text,
    })),
    { role: "user", content: current },
  ]);
}

export async function isOnniOllamaAvailable(): Promise<boolean> {
  if (!isElectronDesktopApp()) return false;
  return isOnniElectronBrainAvailable();
}

export type OnniOllamaAskResult = {
  text: string | null;
  error: string;
};

/**
 * Pregunta al cerebro local. Devuelve texto o error explícito.
 */
export async function askOnniOllamaDetailed(
  body: OnniOllamaRequest,
  onPartial?: (accumulatedText: string) => void,
): Promise<OnniOllamaAskResult> {
  const message = body.message.trim();
  if (!message) return { text: null, error: "Mensaje vacío." };
  if (!(await isOnniOllamaAvailable())) {
    return { text: null, error: "Cerebro local no detectado en este OnniVers." };
  }

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `onni-${Date.now()}`;

  const full = buildBrainMessages(body);
  const minimal = minimalOnniBrainMessages(full);

  const viaIpc = await askOnniElectronBrainDetailed(
    { requestId, messages: full },
    onPartial,
  );
  if (viaIpc.text) return viaIpc;

  const viaHttp = await askLlamaHttpDirect(full, onPartial);
  if (viaHttp.text) return viaHttp;

  // Último recurso: sin historial (evita cualquier choque de plantilla).
  const viaMinimal = await askLlamaHttpDirect(minimal, onPartial);
  if (viaMinimal.text) return viaMinimal;

  return {
    text: null,
    error:
      viaIpc.error || viaHttp.error || viaMinimal.error || "Cerebro local sin respuesta.",
  };
}

/** Compat: solo texto o null. */
export async function askOnniOllama(
  body: OnniOllamaRequest,
  onPartial?: (accumulatedText: string) => void,
): Promise<string | null> {
  const result = await askOnniOllamaDetailed(body, onPartial);
  return result.text;
}

async function askLlamaHttpDirect(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  onPartial?: (accumulatedText: string) => void,
): Promise<OnniOllamaAskResult> {
  try {
    const response = await fetch("/api/onni-brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "onni-cerebro",
        messages,
        stream: false,
        temperature: 0.4,
        max_tokens: 160,
      }),
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      return {
        text: null,
        error: `HTTP cerebro ${response.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`,
      };
    }
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      error?: string;
    };
    const raw = json?.choices?.[0]?.message?.content;
    const text = (typeof raw === "string" ? raw : String(raw ?? "")).trim();
    if (!text) {
      return { text: null, error: json?.error || "HTTP cerebro vacío." };
    }
    onPartial?.(text);
    console.info("[Onni cerebro] http-local", text.slice(0, 80));
    return { text, error: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Onni cerebro] http-local falló", message);
    return { text: null, error: message };
  }
}
