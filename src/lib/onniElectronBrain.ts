import { isElectronDesktopApp } from "@/lib/deviceDetection";

export type OnniBrainMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OnniElectronBrainChatPayload = {
  requestId: string;
  messages: OnniBrainMessage[];
};

export type OnniElectronBrainResult = {
  text: string | null;
  error: string;
};

export function isOnniElectronBrainBridgePresent(): boolean {
  return typeof window.onniversDesktop?.brain?.chat === "function";
}

export async function isOnniElectronBrainAvailable(): Promise<boolean> {
  if (!isElectronDesktopApp()) return false;
  const brain = window.onniversDesktop?.brain;
  if (!brain?.chat) return false;
  if (typeof brain.isAvailable !== "function") return true;
  try {
    return Boolean(await brain.isAvailable());
  } catch {
    return false;
  }
}

/** Chat con cerebro embebido vía IPC (llama.cpp). */
export async function askOnniElectronBrainDetailed(
  payload: OnniElectronBrainChatPayload,
  onPartial?: (accumulatedText: string) => void,
): Promise<OnniElectronBrainResult> {
  const brain = window.onniversDesktop?.brain;
  if (!brain?.chat) {
    return { text: null, error: "Puente IPC del cerebro no disponible." };
  }

  const requestId = payload.requestId;
  const unsubscribe =
    onPartial && brain.onPartial
      ? brain.onPartial((id, text) => {
          if (id === requestId) onPartial(text);
        })
      : () => {};

  try {
    const result = await brain.chat({
      requestId,
      messages: payload.messages,
    });
    // Compatible con { text } o string crudo.
    const text = String(
      typeof result === "string" ? result : (result?.text ?? ""),
    ).trim();
    if (text) {
      console.info("[Onni cerebro] local", text.slice(0, 80));
      return { text, error: "" };
    }
    const err = String(
      typeof result === "object" && result ? (result.error ?? "") : "",
    ).trim();
    if (err) console.warn("[Onni cerebro] falló", err);
    return { text: null, error: err || "Respuesta vacía del cerebro." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Onni cerebro] falló", message);
    return { text: null, error: message };
  } finally {
    unsubscribe();
  }
}

export async function askOnniElectronBrain(
  payload: OnniElectronBrainChatPayload,
  onPartial?: (accumulatedText: string) => void,
): Promise<string | null> {
  const result = await askOnniElectronBrainDetailed(payload, onPartial);
  return result.text;
}
