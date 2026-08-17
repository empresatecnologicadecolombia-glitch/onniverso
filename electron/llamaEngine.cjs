const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");
const { normalizeMessages, minimalMessages } = require("./onniBrainMessages.cjs");

const ONNI_BRAIN_MODEL = "onni-cerebro-v1.gguf";
const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 8765;
const SERVER_START_TIMEOUT_MS = 120_000;
const GENERATION_TIMEOUT_MS = 90_000;
const CHAT_MAX_TOKENS = 160;
const CHAT_RETRIES = 2;
const LOG_PATH = path.join(os.tmpdir(), "onni-cerebro.log");

function brainLog(msg, extra) {
  const line = `[${new Date().toISOString()}] ${msg}${extra ? ` ${extra}` : ""}`;
  try {
    fs.appendFileSync(LOG_PATH, `${line}\n`, "utf8");
  } catch {
    /* ignore */
  }
  console.info(line);
}

function extractContent(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        if (part && typeof part.content === "string") return part.content;
        return "";
      })
      .join("");
  }
  if (typeof raw === "object" && typeof raw.text === "string") return raw.text;
  return String(raw);
}

class LlamaEngine {
  /** @type {boolean | null} */
  availableCache = null;
  /** @type {import("node:child_process").ChildProcess | null} */
  serverProcess = null;
  /** @type {Promise<void> | null} */
  startingPromise = null;
  /** @type {Promise<unknown>} */
  chatChain = Promise.resolve();

  getLlamaDir() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "llama");
    }
    return path.join(__dirname, "llama", "publish");
  }

  getServerPath() {
    const dir = this.getLlamaDir();
    const exe = path.join(dir, "llama-server.exe");
    return fs.existsSync(exe) ? exe : null;
  }

  getModelPath() {
    const dir = this.getLlamaDir();
    const preferred = [ONNI_BRAIN_MODEL, "onni-cerebro-v1.gguf", "gemma-3-1b-it-Q4_K_M.gguf"];
    for (const name of preferred) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return full;
    }
    try {
      const match = fs.readdirSync(dir).find((name) => name.toLowerCase().endsWith(".gguf"));
      return match ? path.join(dir, match) : null;
    } catch {
      return null;
    }
  }

  getThreadCount() {
    const cpus = os.cpus()?.length ?? 4;
    return Math.max(2, Math.min(6, cpus - 1));
  }

  isReady() {
    if (this.availableCache !== null) return this.availableCache;
    const server = this.getServerPath();
    const model = this.getModelPath();
    const impl = path.join(this.getLlamaDir(), "llama-server-impl.dll");
    const ggml = path.join(this.getLlamaDir(), "ggml.dll");
    this.availableCache = Boolean(
      server &&
        model &&
        fs.existsSync(server) &&
        fs.statSync(server).size > 1_000 &&
        fs.existsSync(model) &&
        fs.statSync(model).size > 50_000_000 &&
        fs.existsSync(impl) &&
        fs.statSync(impl).size > 100_000 &&
        fs.existsSync(ggml),
    );
    brainLog(
      `isReady=${this.availableCache} dir=${this.getLlamaDir()} model=${model || "none"}`,
    );
    return this.availableCache;
  }

  /** Solo mata listeners ajenos si el puerto está ocupado y NO responde health/loading. */
  freeServerPort() {
    if (process.platform !== "win32") return;
    try {
      const out = execSync(`netstat -ano | findstr :${SERVER_PORT}`, {
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, {
            windowsHide: true,
            stdio: "ignore",
          });
          brainLog(`freeServerPort killed pid=${pid}`);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* nada escuchando */
    }
  }

  async probeHealth() {
    try {
      const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return "ok";
      if (response.status === 503) return "loading";
      return "error";
    } catch {
      return "down";
    }
  }

  async waitForHealth(timeoutMs = SERVER_START_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await this.probeHealth();
      if (status === "ok") return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("El cerebro de Onni tardó demasiado en iniciar.");
  }

  async ensureServerRunning({ forceRestart = false } = {}) {
    if (!this.isReady()) {
      throw new Error("Cerebro de Onni no instalado. Reinstala OnniVers.");
    }

    if (!forceRestart) {
      const status = await this.probeHealth();
      brainLog(`ensureServer status=${status}`);
      if (status === "ok") return;
      if (status === "loading") {
        brainLog("waiting for loading (503) — not killing");
        await this.waitForHealth(SERVER_START_TIMEOUT_MS);
        return;
      }
      if (this.serverProcess && !this.serverProcess.killed) {
        await this.waitForHealth(SERVER_START_TIMEOUT_MS);
        return;
      }
      if (this.startingPromise) {
        await this.startingPromise;
        await this.waitForHealth(SERVER_START_TIMEOUT_MS);
        return;
      }
    } else {
      brainLog("forceRestart");
      this.stopServer();
      this.freeServerPort();
    }

    if (this.startingPromise) {
      await this.startingPromise;
      await this.waitForHealth(SERVER_START_TIMEOUT_MS);
      return;
    }

    this.startingPromise = this.startServer();
    try {
      await this.startingPromise;
    } finally {
      this.startingPromise = null;
    }
  }

  startServer() {
    return (async () => {
      const exe = this.getServerPath();
      const model = this.getModelPath();
      if (!exe || !model) {
        throw new Error("Faltan archivos del cerebro de Onni.");
      }

      const status = await this.probeHealth();
      if (status === "ok" || status === "loading") {
        brainLog(`startServer skipped; already ${status}`);
        await this.waitForHealth();
        return;
      }

      this.freeServerPort();

      const args = [
        "-m",
        model,
        "--host",
        SERVER_HOST,
        "--port",
        String(SERVER_PORT),
        "-c",
        "2048",
        "-t",
        String(this.getThreadCount()),
        "-ngl",
        "0",
        "--jinja",
      ];

      brainLog(`spawn ${exe}`);
      const child = spawn(exe, args, {
        windowsHide: true,
        cwd: path.dirname(exe),
        stdio: ["ignore", "ignore", "pipe"],
        detached: true,
      });
      try {
        child.unref();
      } catch {
        /* ignore */
      }
      this.serverProcess = child;

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (error) => {
        this.serverProcess = null;
        brainLog(`spawn error ${error.message}`);
      });

      child.on("exit", (code) => {
        if (this.serverProcess === child) this.serverProcess = null;
        brainLog(`child exit code=${code} stderr=${stderr.slice(-400)}`);
      });

      try {
        await this.waitForHealth();
        brainLog("server healthy");
      } catch (error) {
        this.killServerHard();
        this.freeServerPort();
        const detail = stderr.trim().slice(-300);
        throw detail
          ? new Error(
              `${error instanceof Error ? error.message : error} Detalle: ${detail}`,
            )
          : error;
      }
    })();
  }

  stopServer() {
    // No matar el proceso detached del sistema: solo soltar la referencia.
    // Así el cerebro sigue vivo entre reinicios de la UI.
    this.serverProcess = null;
  }

  killServerHard() {
    if (this.serverProcess) {
      try {
        process.kill(this.serverProcess.pid);
      } catch {
        /* ignore */
      }
      this.serverProcess = null;
    }
  }

  async chat(messages, onPartial) {
    const run = () => this.chatExclusive(messages, onPartial);
    const next = this.chatChain.then(run, run);
    this.chatChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async chatExclusive(messages, onPartial) {
    let lastError = null;
    const cleanMessages = normalizeMessages(messages);
    const fallbackMessages = minimalMessages(messages);
    brainLog(
      `chat start msgs=${cleanMessages.length} roles=${cleanMessages
        .map((m) => m.role[0])
        .join("")}`,
    );

    for (let attempt = 1; attempt <= CHAT_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
      // 2º intento: sin historial (blinda contra choques de plantilla).
      const payload = attempt === 1 ? cleanMessages : fallbackMessages;
      try {
        const health = await this.probeHealth();
        await this.ensureServerRunning({
          forceRestart: attempt > 1 && health === "down",
        });

        let answer = "";
        try {
          answer = await this.chatPlain(payload, controller.signal);
          brainLog(`plain attempt=${attempt} len=${answer.trim().length}`);
        } catch (plainError) {
          lastError = plainError;
          brainLog(
            `plain fail attempt=${attempt}`,
            plainError instanceof Error ? plainError.message : String(plainError),
          );
        }

        if (!answer.trim()) {
          try {
            answer = await this.chatStreaming(payload, onPartial, controller.signal);
            brainLog(`stream attempt=${attempt} len=${answer.trim().length}`);
          } catch (streamError) {
            lastError = streamError;
            brainLog(
              `stream fail attempt=${attempt}`,
              streamError instanceof Error ? streamError.message : String(streamError),
            );
          }
        } else if (onPartial) {
          onPartial(answer.trim());
        }

        const finalAnswer = answer.trim();
        if (finalAnswer) {
          brainLog(`chat OK len=${finalAnswer.length}`);
          return finalAnswer;
        }

        lastError = new Error("El cerebro de Onni no generó respuesta.");
      } catch (error) {
        lastError = error;
        brainLog(
          `chat attempt fail ${attempt}`,
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        clearTimeout(timer);
      }

      await new Promise((r) => setTimeout(r, 800));
    }

    const err =
      lastError instanceof Error
        ? lastError
        : new Error("El cerebro de Onni no respondió tras varios intentos.");
    brainLog(`chat GIVE UP ${err.message}`);
    throw err;
  }

  async chatStreaming(messages, onPartial, signal) {
    const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "onni-cerebro",
        messages,
        stream: true,
        temperature: 0.4,
        max_tokens: CHAT_MAX_TOKENS,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Cerebro de Onni falló (${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          const piece = extractContent(chunk?.choices?.[0]?.delta?.content ?? "");
          if (piece) {
            answer += piece;
            onPartial?.(answer);
          }
        } catch {
          /* ignore */
        }
      }
    }

    return answer;
  }

  async chatPlain(messages, signal) {
    const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "onni-cerebro",
        messages,
        stream: false,
        temperature: 0.4,
        max_tokens: CHAT_MAX_TOKENS,
      }),
      signal,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      brainLog(`chatPlain HTTP ${response.status}`, errText.slice(0, 300));
      throw new Error(`Cerebro de Onni falló (${response.status}). ${errText.slice(0, 160)}`);
    }
    const json = await response.json();
    return extractContent(json?.choices?.[0]?.message?.content).trim();
  }
}

module.exports = {
  LlamaEngine,
  ONNI_BRAIN_MODEL,
  LOG_PATH,
  normalizeMessages,
  minimalMessages,
};
