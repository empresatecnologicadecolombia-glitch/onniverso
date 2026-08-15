const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

const ONNI_BRAIN_MODEL = "onni-cerebro-v1.gguf";
const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 8765;
const SERVER_START_TIMEOUT_MS = 120_000;
const GENERATION_TIMEOUT_MS = 90_000;
const CHAT_MAX_TOKENS = 128;
const CHAT_RETRIES = 3;

class LlamaEngine {
  /** @type {boolean | null} */
  availableCache = null;
  /** @type {import("node:child_process").ChildProcess | null} */
  serverProcess = null;
  /** @type {Promise<void> | null} */
  startingPromise = null;

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
    const match = fs.readdirSync(dir).find((name) => name.toLowerCase().endsWith(".gguf"));
    return match ? path.join(dir, match) : null;
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
    return this.availableCache;
  }

  /** Mata procesos ajenos en el puerto del cerebro (causa típica de "no respondió"). */
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
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* nada escuchando */
    }
  }

  async waitForHealth(timeoutMs = SERVER_START_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/health`, {
          signal: AbortSignal.timeout(2_000),
        });
        if (response.ok) return;
      } catch {
        /* retry */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("El cerebro de Onni tardó demasiado en iniciar.");
  }

  async ensureServerRunning({ forceRestart = false } = {}) {
    if (!this.isReady()) {
      throw new Error("Cerebro de Onni no instalado. Reinstala OnniVers.");
    }

    // Si ya hay un llama-server sano en 8765, reutilizarlo (no matarlo).
    if (!forceRestart) {
      try {
        await this.waitForHealth(2_500);
        return;
      } catch {
        /* hay que arrancar */
      }
    }

    if (forceRestart) {
      this.stopServer();
      this.freeServerPort();
    }

    if (this.serverProcess && !this.serverProcess.killed && !forceRestart) {
      try {
        await this.waitForHealth(3_000);
        return;
      } catch {
        this.stopServer();
      }
    }

    if (this.startingPromise) {
      await this.startingPromise;
      // Tras el arranque, confirmar health (aunque el child interno haya fallado el bind).
      await this.waitForHealth(5_000);
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
    return new Promise((resolve, reject) => {
      const exe = this.getServerPath();
      const model = this.getModelPath();
      if (!exe || !model) {
        reject(new Error("Faltan archivos del cerebro de Onni."));
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

      const child = spawn(exe, args, {
        windowsHide: true,
        cwd: path.dirname(exe),
        stdio: ["ignore", "ignore", "pipe"],
      });
      this.serverProcess = child;

      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (error) => {
        this.serverProcess = null;
        reject(error);
      });

      child.on("exit", (code) => {
        if (this.serverProcess === child) {
          this.serverProcess = null;
        }
        if (code !== 0 && code !== null) {
          console.warn("[Onni cerebro] llama-server salió:", code, stderr.slice(-500));
        }
      });

      void this.waitForHealth()
        .then(resolve)
        .catch((error) => {
          this.stopServer();
          this.freeServerPort();
          const detail = stderr.trim().slice(-300);
          reject(
            detail
              ? new Error(`${error.message} Detalle: ${detail}`)
              : error,
          );
        });
    });
  }

  stopServer() {
    if (!this.serverProcess) return;
    try {
      this.serverProcess.kill();
    } catch {
      /* ignore */
    }
    this.serverProcess = null;
  }

  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @param {(text: string) => void} [onPartial]
   */
  async chat(messages, onPartial) {
    let lastError = null;

    for (let attempt = 1; attempt <= CHAT_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
      try {
        await this.ensureServerRunning({ forceRestart: attempt > 1 });

        // Plain primero: más estable que SSE en Electron/Windows.
        let answer = "";
        try {
          answer = await this.chatPlain(messages, controller.signal);
        } catch (plainError) {
          lastError = plainError;
          console.warn(
            `[Onni cerebro] plain intento ${attempt} falló:`,
            plainError instanceof Error ? plainError.message : plainError,
          );
        }

        if (!answer.trim()) {
          try {
            answer = await this.chatStreaming(messages, onPartial, controller.signal);
          } catch (streamError) {
            lastError = streamError;
            console.warn(
              `[Onni cerebro] stream intento ${attempt} falló:`,
              streamError instanceof Error ? streamError.message : streamError,
            );
          }
        } else if (onPartial) {
          onPartial(answer.trim());
        }

        const finalAnswer = answer.trim();
        if (finalAnswer) return finalAnswer;

        lastError = new Error("El cerebro de Onni no generó respuesta.");
      } catch (error) {
        lastError = error;
        console.warn(
          `[Onni cerebro] intento ${attempt}/${CHAT_RETRIES} falló:`,
          error instanceof Error ? error.message : error,
        );
      } finally {
        clearTimeout(timer);
      }

      this.stopServer();
      this.freeServerPort();
      await new Promise((r) => setTimeout(r, 400));
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("El cerebro de Onni no respondió tras varios intentos.");
  }

  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @param {(text: string) => void} [onPartial]
   * @param {AbortSignal} signal
   */
  async chatStreaming(messages, onPartial, signal) {
    const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "onni-cerebro",
        messages,
        stream: true,
        temperature: 0.55,
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
          const piece = chunk?.choices?.[0]?.delta?.content ?? "";
          if (piece) {
            answer += piece;
            onPartial?.(answer);
          }
        } catch {
          /* ignore malformed SSE chunk */
        }
      }
    }

    return answer;
  }

  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @param {AbortSignal} signal
   */
  async chatPlain(messages, signal) {
    const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "onni-cerebro",
        messages,
        stream: false,
        temperature: 0.55,
        max_tokens: CHAT_MAX_TOKENS,
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Cerebro de Onni falló (${response.status}).`);
    }
    const json = await response.json();
    return String(json?.choices?.[0]?.message?.content ?? "");
  }
}

module.exports = { LlamaEngine, ONNI_BRAIN_MODEL };
