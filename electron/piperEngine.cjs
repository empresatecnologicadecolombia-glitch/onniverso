const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

const PIPER_TIMEOUT_MS = 60_000;

class PiperEngine {
  /** @type {boolean | null} */
  availableCache = null;

  getPiperDir() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "piper");
    }
    return path.join(__dirname, "piper", "publish");
  }

  getExePath() {
    const dir = this.getPiperDir();
    const exe = path.join(dir, "piper.exe");
    return fs.existsSync(exe) ? exe : null;
  }

  getModelPath() {
    const dir = this.getPiperDir();
    const preferred = [
      "es_MX-claude-high.onnx",
      "es_ES-sharvard-medium.onnx",
      "es_ES-davefx-medium.onnx",
    ];
    for (const name of preferred) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return full;
    }
    const match = fs
      .readdirSync(dir)
      .find((name) => name.toLowerCase().endsWith(".onnx") && !name.toLowerCase().endsWith(".onnx.json"));
    return match ? path.join(dir, match) : null;
  }

  isReady() {
    if (this.availableCache !== null) return this.availableCache;
    const exe = this.getExePath();
    const model = this.getModelPath();
    const espeakTab = path.join(this.getPiperDir(), "espeak-ng-data", "phontab");
    this.availableCache = Boolean(exe && model && fs.existsSync(model) && fs.existsSync(espeakTab));
    return this.availableCache;
  }

  /**
   * @param {string} text
   * @returns {Promise<{ audioBase64: string, mimeType: string }>}
   */
  async synthesize(text) {
    if (!this.isReady()) {
      throw new Error("Piper no está instalado. Ejecuta npm run desktop:piper-build.");
    }
    const clean = String(text ?? "")
      .replace(/\n+/g, ". ")
      .trim();
    if (!clean) {
      throw new Error("Texto vacío.");
    }

    const exe = this.getExePath();
    const model = this.getModelPath();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "onni-piper-"));
    const outWav = path.join(tempDir, "out.wav");

    try {
      await new Promise((resolve, reject) => {
        const child = spawn(exe, ["--model", model, "--output_file", outWav], {
          windowsHide: true,
          cwd: path.dirname(exe),
        });
        let stderr = "";
        const timer = setTimeout(() => {
          try {
            child.kill();
          } catch {
            /* ignore */
          }
          reject(new Error("Piper tardó demasiado."));
        }, PIPER_TIMEOUT_MS);

        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString("utf8");
        });
        child.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          if (code === 0 && fs.existsSync(outWav) && fs.statSync(outWav).size > 44) {
            resolve();
          } else {
            reject(new Error(stderr.trim() || `Piper falló (${code ?? "?"})`));
          }
        });
        child.stdin.write(clean, "utf8");
        child.stdin.end();
      });

      const wav = fs.readFileSync(outWav);
      return {
        audioBase64: wav.toString("base64"),
        mimeType: "audio/wav",
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

module.exports = { PiperEngine };
