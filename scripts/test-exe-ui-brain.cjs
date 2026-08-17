/**
 * Prueba REAL de punta a punta del cerebro local en OnniVers PC (.exe):
 * arranca el .exe como si acabaras de prender el PC, escribe en el chat de Onni
 * y verifica que la respuesta venga del cerebro (no de un texto fijo).
 *
 * Uso: node scripts/test-exe-ui-brain.cjs
 */
const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const INSTALL = path.join(process.env.LOCALAPPDATA || "", "Programs", "OnniVers");
const EXE = path.join(INSTALL, "OnniVers.exe");
const DEBUG_PORT = 9333;

const PREFAB = [
  "Pensando con el cerebro local",
  "Reintentando cerebro local",
  "No pude usar el cerebro local",
  "Estoy cargando el cerebro local",
  "cerebro local no contestó",
  "cerebro local tardo en arrancar",
];

function log(msg) {
  console.log(`${new Date().toISOString().slice(11, 19)} ${msg}`);
}

function killAll() {
  for (const name of ["OnniVers.exe", "llama-server.exe"]) {
    try {
      execSync(`taskkill /IM ${name} /F`, { stdio: "ignore", windowsHide: true });
    } catch {
      /* no estaba corriendo */
    }
  }
}

async function findPageTarget(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`, {
        signal: AbortSignal.timeout(2000),
      });
      const targets = await res.json();
      const page = targets.find(
        (t) => t.type === "page" && typeof t.url === "string" && t.url.startsWith("http"),
      );
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      /* aún no */
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error("no encontré la ventana de OnniVers por CDP");
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(new Error(`ws error ${e?.message ?? ""}`));
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        this.pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(msg.error.message));
        else entry.resolve(msg.result);
      };
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        `JS error: ${result.exceptionDetails.exception?.description ?? "desconocido"}`,
      );
    }
    return result.result?.value;
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
  }
}

const READ_BUBBLES = `
(() => {
  const root = document.querySelector('[data-onni-chat-root]');
  if (!root) return null;
  const scroll = root.querySelector('div.overflow-y-auto');
  if (!scroll) return null;
  return Array.from(scroll.querySelectorAll('div'))
    .filter((el) => typeof el.className === 'string' && el.className.includes('whitespace-pre-wrap'))
    .map((el) => ({
      role: el.className.includes('bg-cyan-500/25') ? 'user' : 'assistant',
      text: el.textContent.trim(),
    }));
})()
`;

const OPEN_CHAT = `
(async () => {
  if (document.querySelector('[data-onni-chat-root]')) return 'ya-abierto';
  const btn = Array.from(document.querySelectorAll('button')).find((b) =>
    (b.getAttribute('aria-label') || '').includes('Abrir Onni'),
  );
  if (!btn) return 'sin-boton';
  btn.click();
  await new Promise((r) => setTimeout(r, 800));
  return document.querySelector('[data-onni-chat-root]') ? 'abierto' : 'fallo';
})()
`;

function sendMessageScript(text) {
  const safe = JSON.stringify(text);
  return `
(async () => {
  const root = document.querySelector('[data-onni-chat-root]');
  if (!root) return 'sin-chat';
  const input = root.querySelector('input');
  if (!input) return 'sin-input';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, ${safe});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));
  const form = input.closest('form');
  if (!form) return 'sin-form';
  form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  return 'enviado';
})()
`;
}

async function askInUi(cdp, text, timeoutMs = 120000) {
  const before = (await cdp.evaluate(READ_BUBBLES)) || [];
  const beforeCount = before.length;

  const sent = await cdp.evaluate(sendMessageScript(text));
  if (sent !== "enviado") throw new Error(`no pude enviar: ${sent}`);

  const deadline = Date.now() + timeoutMs;
  let lastSeen = "";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 900));
    const bubbles = (await cdp.evaluate(READ_BUBBLES)) || [];
    if (bubbles.length <= beforeCount) continue;
    const fresh = bubbles.slice(beforeCount);
    const answer = [...fresh].reverse().find((b) => b.role === "assistant");
    if (!answer) continue;
    lastSeen = answer.text;
    const isPlaceholder = PREFAB.some((p) => answer.text.includes(p));
    if (!isPlaceholder && answer.text.length > 0) {
      return { text: answer.text, elapsed: timeoutMs - (deadline - Date.now()) };
    }
  }
  return { text: lastSeen, timeout: true };
}

const QUESTIONS = [
  "hola como estas oni",
  "quiero saber que haces",
  "cuentame un chiste corto",
  "dame una idea para una clase de ciencias",
  "que cerebro usas",
];

(async () => {
  log("=== arranque en frío: cerrando OnniVers y cerebro ===");
  killAll();
  await new Promise((r) => setTimeout(r, 2500));

  if (!fs.existsSync(EXE)) throw new Error(`no existe ${EXE}`);
  log("abriendo OnniVers con depuración remota…");
  const child = spawn(EXE, [`--remote-debugging-port=${DEBUG_PORT}`], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  const target = await findPageTarget();
  log(`ventana lista: ${target.url}`);
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Runtime.enable");

  // Esperar que React monte el asistente.
  for (let i = 0; i < 40; i += 1) {
    const ready = await cdp.evaluate(
      `Boolean(document.querySelector('[data-onni-chat-root]') || Array.from(document.querySelectorAll('button')).some(b => (b.getAttribute('aria-label')||'').includes('Abrir Onni')))`,
    );
    if (ready) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  const opened = await cdp.evaluate(OPEN_CHAT);
  log(`chat de Onni: ${opened}`);

  const results = [];
  for (const q of QUESTIONS) {
    const res = await askInUi(cdp, q);
    const ok = !res.timeout && res.text.length > 0 && !PREFAB.some((p) => res.text.includes(p));
    log(`${ok ? "OK  " : "FAIL"} "${q}" → ${res.text.replace(/\s+/g, " ").slice(0, 110)}`);
    results.push({ question: q, ok, answer: res.text });
  }

  cdp.close();

  const failed = results.filter((r) => !r.ok);
  log(`RESULTADO UI: ${results.length - failed.length}/${results.length} OK`);
  fs.writeFileSync(
    path.join(os.tmpdir(), "onni-ui-suite.json"),
    JSON.stringify(results, null, 2),
    "utf8",
  );
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
