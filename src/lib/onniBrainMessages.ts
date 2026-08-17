export type OnniBrainRole = "system" | "user" | "assistant";

export type OnniBrainChatMessage = {
  role: OnniBrainRole;
  content: string;
};

/**
 * llama.cpp con plantilla Gemma exige: un solo system al inicio, luego
 * user/assistant estrictamente alternados empezando y terminando en user.
 * Si no, responde HTTP 400 ("Conversation roles must alternate").
 */
export function normalizeOnniBrainMessages(
  messages: OnniBrainChatMessage[],
): OnniBrainChatMessage[] {
  const systemParts: string[] = [];
  const turns: OnniBrainChatMessage[] = [];

  for (const raw of messages ?? []) {
    const content = String(raw?.content ?? "").trim();
    if (!content) continue;
    const role: OnniBrainRole =
      raw.role === "system" || raw.role === "assistant" ? raw.role : "user";

    if (role === "system") {
      systemParts.push(content);
      continue;
    }

    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content}\n${content}`;
      continue;
    }
    turns.push({ role, content });
  }

  // La conversación debe abrir con user.
  while (turns.length > 0 && turns[0].role === "assistant") {
    turns.shift();
  }
  // Y cerrar con user (el mensaje que se está respondiendo).
  while (turns.length > 0 && turns[turns.length - 1].role === "assistant") {
    turns.pop();
  }

  const out: OnniBrainChatMessage[] = [];
  if (systemParts.length > 0) {
    out.push({ role: "system", content: systemParts.join(" ") });
  }
  out.push(...turns);
  return out;
}

/** Último mensaje del usuario + system: payload mínimo garantizado. */
export function minimalOnniBrainMessages(
  messages: OnniBrainChatMessage[],
): OnniBrainChatMessage[] {
  const normalized = normalizeOnniBrainMessages(messages);
  const system = normalized.find((m) => m.role === "system");
  const lastUser = [...normalized].reverse().find((m) => m.role === "user");
  const out: OnniBrainChatMessage[] = [];
  if (system) out.push(system);
  if (lastUser) out.push(lastUser);
  return out;
}
