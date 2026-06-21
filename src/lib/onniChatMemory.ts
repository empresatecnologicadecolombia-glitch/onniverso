export type OnniChatTurn = { role: "user" | "assistant"; text: string };

const STORAGE_KEY_PREFIX = "onnivers.onni.chat.v1";

/** Mensajes guardados en el dispositivo (UI del chat). */
export const ONNI_CHAT_MAX_STORED = 80;

/** Turnos enviados a Gemini/Ollama (evita exceder tokens). */
export const ONNI_CHAT_MAX_AI_TURNS = 16;

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}.${userId ?? "guest"}`;
}

function isValidTurn(value: unknown): value is OnniChatTurn {
  if (!value || typeof value !== "object") return false;
  const row = value as { role?: unknown; text?: unknown };
  return (row.role === "user" || row.role === "assistant") && typeof row.text === "string";
}

export function loadOnniChatMessages(
  userId: string | null | undefined,
  fallback: OnniChatTurn[],
): OnniChatTurn[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const turns = parsed.filter(isValidTurn).map((m) => ({ role: m.role, text: m.text.trim() })).filter((m) => m.text);
    return turns.length > 0 ? turns.slice(-ONNI_CHAT_MAX_STORED) : fallback;
  } catch {
    return fallback;
  }
}

export function saveOnniChatMessages(userId: string | null | undefined, messages: OnniChatTurn[]): void {
  try {
    const trimmed = messages
      .filter((m) => m.text.trim())
      .slice(-ONNI_CHAT_MAX_STORED)
      .map((m) => ({ role: m.role, text: m.text }));
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  } catch {
    /* quota / modo privado */
  }
}

/** Historial reciente para IA (sin el mensaje actual). */
export function buildOnniAiHistory(messages: OnniChatTurn[]): OnniChatTurn[] {
  return messages
    .filter((m) => m.text.trim())
    .slice(-ONNI_CHAT_MAX_AI_TURNS * 2);
}
