const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

const ONNI_BRAIN_MODEL = "onni-cerebro-v1.gguf";
const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 8765;
const SERVER_START_TIMEOUT_MS = 120_000;
const GENERATION_TIMEOUT_MS = 90_000;

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
    return Math.max(2, Math.min(8, cpus - 1));
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

  async ensureServerRunning() {
    if (!this.isReady()) {
      throw new Error("Cerebro de Onni no instalado. Reinstala OnniVers.");
    }
    if (this.serverProcess && !this.serverProcess.killed) {
      try {
        await this.waitForHealth(3_000);
        return;
      } catch {
        this.stopServer();
      }
    }
    if (this.startingPromise) {
      await this.startingPromise;
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

      const args = [
        "-m",
        model,
        "--host",
        SERVER_HOST,
        "--port",
        String(SERVER_PORT),
        "-c",
        "4096",
        "-t",
        String(this.getThreadCount()),
        "-ngl",
        "0",
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
          console.warn("[Onni cerebro] llama-server salió:", code, stderr.slice(-400));
        }
      });

      void this.waitForHealth()
        .then(resolve)
        .catch((error) => {
          this.stopServer();
          reject(error);
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
    await this.ensureServerRunning();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "onni-cerebro",
          messages,
          stream: true,
          temperature: 0.65,
          max_tokens: 256,
        }),
        signal: controller.signal,
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

      const finalAnswer = answer.trim();
      if (!finalAnswer) {
        throw new Error("El cerebro de Onni no generó respuesta.");
      }
      return finalAnswer;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { LlamaEngine, ONNI_BRAIN_MODEL };
