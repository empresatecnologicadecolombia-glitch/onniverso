/**
 * Saneado de mensajes para llama.cpp (plantilla Gemma).
 * Requisitos: un solo `system`, luego `user`/`assistant` estrictamente
 * alternados, empezando y terminando en `user`. Si no → HTTP 400
 * ("Conversation roles must alternate user/assistant").
 *
 * Sin dependencias de Electron: se puede testear con node directo.
 */

/** @param {Array<{ role?: unknown, content?: unknown }>} messages */
function normalizeMessages(messages) {
  const systemParts = [];
  const turns = [];

  for (const raw of Array.isArray(messages) ? messages : []) {
    const content = String(raw?.content ?? "").trim();
    if (!content) continue;
    const role = raw?.role === "system" || raw?.role === "assistant" ? raw.role : "user";

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

  while (turns.length > 0 && turns[0].role === "assistant") turns.shift();
  while (turns.length > 0 && turns[turns.length - 1].role === "assistant") turns.pop();

  const out = [];
  if (systemParts.length > 0) out.push({ role: "system", content: systemParts.join(" ") });
  out.push(...turns);
  return out;
}

/** @param {Array<{ role?: unknown, content?: unknown }>} messages */
function minimalMessages(messages) {
  const normalized = normalizeMessages(messages);
  const system = normalized.find((m) => m.role === "system");
  const lastUser = [...normalized].reverse().find((m) => m.role === "user");
  const out = [];
  if (system) out.push(system);
  if (lastUser) out.push(lastUser);
  return out;
}

module.exports = { normalizeMessages, minimalMessages };
