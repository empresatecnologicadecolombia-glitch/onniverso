import { isElectronDesktopApp } from "@/lib/deviceDetection";

export type OnniBrainMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OnniElectronBrainChatPayload = {
  requestId: string;
  messages: OnniBrainMessage[];
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
export async function askOnniElectronBrain(
  payload: OnniElectronBrainChatPayload,
  onPartial?: (accumulatedText: string) => void,
): Promise<string | null> {
  const brain = window.onniversDesktop?.brain;
  if (!brain?.chat) return null;

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
    const text = String(result?.text ?? "").trim();
    console.info("[Onni cerebro] local", text.slice(0, 80));
    return text || null;
  } catch (error) {
    console.warn("[Onni cerebro] falló", error);
    return null;
  } finally {
    unsubscribe();
  }
}
