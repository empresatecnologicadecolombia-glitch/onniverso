/**
 * Suite de pruebas del cerebro local de Onni.
 * - Arranca llama-server del OnniVers instalado si no está vivo.
 * - Valida el saneado de mensajes (mismo módulo que usa Electron).
 * - Manda conversaciones reales (las que rompían con HTTP 400).
 *
 * Uso: node scripts/test-brain-suite.cjs
 */
const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { normalizeMessages, minimalMessages } = require("../electron/onniBrainMessages.cjs");

const PORT = 8765;
const LLAMA_DIR = path.join(
  process.env.LOCALAPPDATA || "",
  "Programs",
  "OnniVers",
  "resources",
  "llama",
);
const EXE = path.join(LLAMA_DIR, "llama-server.exe");
const MODEL = path.join(LLAMA_DIR, "onni-cerebro-v1.gguf");

const SYSTEM =
  "Eres Onni, asistente de OnniVers PC. Usas SOLO el cerebro local onni-cerebro-v1 (llama.cpp). " +
  "No eres Gemini ni ChatGPT. Responde en español, breve y claro (2 a 5 frases). " +
  "Ruta actual del usuario: /. No inventes menús ni URLs.";

const INTRO = "¡Hola! Soy Onni, tu copiloto en OnniVerso.";

function log(msg) {
  console.log(`${new Date().toISOString().slice(11, 19)} ${msg}`);
}

async function probeHealth() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (r.ok) return "ok";
    if (r.status === 503) return "loading";
    return "error";
  } catch {
    return "down";
  }
}

async function waitHealth(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await probeHealth()) === "ok") return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function ensureServer() {
  const status = await probeHealth();
  if (status === "ok") {
    log("cerebro ya vivo en 8765");
    return null;
  }
  if (status === "loading") {
    log("cerebro cargando; esperando…");
    await waitHealth();
    return null;
  }
  if (!fs.existsSync(EXE) || !fs.existsSync(MODEL)) {
    throw new Error(`faltan archivos del cerebro en ${LLAMA_DIR}`);
  }
  try {
    execSync(`netstat -ano | findstr :${PORT}`, { stdio: "ignore", windowsHide: true });
  } catch {
    /* nadie escuchando */
  }
  log("arrancando llama-server…");
  const child = spawn(
    EXE,
    ["-m", MODEL, "--host", "127.0.0.1", "--port", String(PORT), "-c", "2048", "-t", "4", "-ngl", "0", "--jinja"],
    { cwd: LLAMA_DIR, windowsHide: true, stdio: ["ignore", "ignore", "pipe"], detached: true },
  );
  child.unref();
  const ok = await waitHealth();
  if (!ok) throw new Error("llama-server no llegó a health ok");
  log("cerebro listo");
  return child;
}

async function chat(messages) {
  const t0 = Date.now();
  const res = await fetch(`http://127.0.0.1:${PORT}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "onni-cerebro",
      messages,
      stream: false,
      temperature: 0.4,
      max_tokens: 160,
    }),
    signal: AbortSignal.timeout(90000),
  });
  const bodyText = await res.text();
  let content = "";
  try {
    const json = JSON.parse(bodyText);
    content = String(json?.choices?.[0]?.message?.content ?? "").trim();
  } catch {
    /* no json */
  }
  return { status: res.status, ms: Date.now() - t0, content, raw: bodyText.slice(0, 240) };
}

/** Conversaciones tal como las arma la UI (historial incluye el intro de Onni). */
const CASES = [
  {
    name: "intro + primer mensaje (el que fallaba 400)",
    raw: [
      { role: "system", content: SYSTEM },
      { role: "assistant", content: INTRO },
      { role: "user", content: "hola como estas oni" },
    ],
  },
  {
    name: "charla libre tras saludo",
    raw: [
      { role: "system", content: SYSTEM },
      { role: "assistant", content: INTRO },
      { role: "user", content: "como vas" },
      { role: "assistant", content: "Todo bien por aquí, listo para ayudarte." },
      { role: "user", content: "quiero saber que haces" },
    ],
  },
  {
    name: "mensaje de usuario duplicado",
    raw: [
      { role: "system", content: SYSTEM },
      { role: "user", content: "cuentame un chiste corto" },
      { role: "user", content: "cuentame un chiste corto" },
    ],
  },
  {
    name: "placeholder Pensando… en historial",
    raw: [
      { role: "system", content: SYSTEM },
      { role: "assistant", content: INTRO },
      { role: "user", content: "que es onnivers" },
      { role: "assistant", content: "Pensando con el cerebro local…" },
      { role: "user", content: "explicame mejor" },
    ],
  },
  {
    name: "historial largo alternado",
    raw: [
      { role: "system", content: SYSTEM },
      { role: "assistant", content: INTRO },
      { role: "user", content: "hola" },
      { role: "assistant", content: "Hola, ¿en qué te ayudo?" },
      { role: "user", content: "que puedes hacer" },
      { role: "assistant", content: "Puedo conversar y guiarte." },
      { role: "user", content: "dame una idea para una clase de ciencias" },
    ],
  },
  {
    name: "mensajes vacíos y rol raro",
    raw: [
      { role: "system", content: SYSTEM },
      { role: "assistant", content: "" },
      { role: "model", content: "ruido" },
      { role: "user", content: "   " },
      { role: "user", content: "resume que es la realidad virtual" },
    ],
  },
];

function validateShape(messages) {
  const problems = [];
  const systems = messages.filter((m) => m.role === "system");
  if (systems.length > 1) problems.push("mas de un system");
  if (systems.length === 1 && messages[0].role !== "system") {
    problems.push("system no va primero");
  }
  const turns = messages.filter((m) => m.role !== "system");
  if (turns.length === 0) problems.push("sin turnos");
  if (turns.length > 0 && turns[0].role !== "user") problems.push("no empieza en user");
  if (turns.length > 0 && turns[turns.length - 1].role !== "user") {
    problems.push("no termina en user");
  }
  for (let i = 1; i < turns.length; i += 1) {
    if (turns[i].role === turns[i - 1].role) problems.push(`roles repetidos en ${i}`);
  }
  if (messages.some((m) => !String(m.content ?? "").trim())) problems.push("contenido vacio");
  return problems;
}

(async () => {
  const results = [];
  await ensureServer();

  for (const testCase of CASES) {
    const normalized = normalizeMessages(testCase.raw);
    const shapeProblems = validateShape(normalized);
    const roles = normalized.map((m) => m.role[0]).join("");

    if (shapeProblems.length > 0) {
      log(`FAIL forma [${testCase.name}] roles=${roles} → ${shapeProblems.join(", ")}`);
      results.push({ name: testCase.name, ok: false, why: shapeProblems.join(", ") });
      continue;
    }

    const res = await chat(normalized);
    const ok = res.status === 200 && res.content.length > 0;
    log(
      `${ok ? "OK  " : "FAIL"} [${testCase.name}] roles=${roles} http=${res.status} ${res.ms}ms ` +
        `→ ${ok ? res.content.replace(/\s+/g, " ").slice(0, 90) : res.raw}`,
    );
    results.push({ name: testCase.name, ok, http: res.status, answer: res.content });

    if (!ok) {
      const fb = await chat(minimalMessages(testCase.raw));
      log(`   fallback minimal http=${fb.status} → ${fb.content.slice(0, 80) || fb.raw}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  log(`RESULTADO: ${results.length - failed.length}/${results.length} OK`);
  const outPath = path.join(os.tmpdir(), "onni-brain-suite.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  log(`detalle: ${outPath}`);
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
