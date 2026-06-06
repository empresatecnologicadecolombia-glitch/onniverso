const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

const WHISPER_TIMEOUT_MS = 120_000;

function spawnDir(command) {
  if (!command) return undefined;
  try {
    return path.dirname(path.resolve(command));
  } catch {
    return undefined;
  }
}

function sanitizeFfmpegError(stderr) {
  const text = String(stderr ?? "");
  if (/EBML header parsing failed|Invalid data found when processing input|Error opening input file/i.test(text)) {
    return "No pude leer el audio grabado. Habla durante el micrófono activo e inténtalo otra vez.";
  }
  if (/No such file|could not find/i.test(text)) {
    return "Falta un componente de audio en OnniVers.";
  }
  const lastLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();
  return lastLine && lastLine.length < 160 ? lastLine : "No pude convertir el audio a texto.";
}

function isValidAudioBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const isWebm =
    buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  const isOgg =
    buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53;
  const isWav =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  return isWebm || isOgg || isWav;
}

class WhisperEngine {
  /** @type {boolean | null} */
  availableCache = null;

  getWhisperDir() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "whisper");
    }
    return path.join(__dirname, "whisper", "publish");
  }

  findBinary(dir, names) {
    /** @type {string | null} */
    let best = null;
    let bestSize = 0;
    const visit = (currentDir) => {
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        const full = path.join(currentDir, entry.name);
        if (entry.isFile() && names.includes(entry.name)) {
          const size = fs.statSync(full).size;
          if (size > bestSize) {
            best = full;
            bestSize = size;
          }
        } else if (entry.isDirectory()) {
          visit(full);
        }
      }
    };
    visit(dir);
    return best;
  }

  getCliPath() {
    const dir = this.getWhisperDir();
    return this.findBinary(dir, ["whisper-cli.exe", "main.exe", "whisper-cli", "main"]);
  }

  getModelPath() {
    const dir = this.getWhisperDir();
    const candidates = ["ggml-small.bin", "ggml-base.bin"];
    for (const name of candidates) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    return path.join(dir, "ggml-small.bin");
  }

  getFfmpegPath() {
    const dir = this.getWhisperDir();
    const bundled = path.join(dir, "ffmpeg.exe");
    if (fs.existsSync(bundled)) return bundled;
    try {
      // eslint-disable-next-line import/no-extraneous-dependencies, global-require
      const ffmpegStatic = require("ffmpeg-static");
      if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
    } catch {
      /* optional in dev */
    }
    return null;
  }

  isReady() {
    if (this.availableCache !== null) return this.availableCache;
    const cli = this.getCliPath();
    const model = this.getModelPath();
    const ffmpeg = this.getFfmpegPath();
    this.availableCache = Boolean(cli && model && fs.existsSync(model) && ffmpeg);
    return this.availableCache;
  }

  /** @param {string} command @param {string[]} args @param {number} timeoutMs */
  run(command, args, timeoutMs = WHISPER_TIMEOUT_MS) {
    const cwd = spawnDir(command);
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { windowsHide: true, cwd });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        reject(new Error("Whisper tardó demasiado. Inténtalo otra vez."));
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0 || stdout.trim()) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(sanitizeFfmpegError(stderr) || `Whisper falló (${code ?? "?"})`));
        }
      });
    });
  }

  async convertToWav(inputPath, outputPath) {
    const ffmpeg = this.getFfmpegPath();
    if (!ffmpeg) {
      throw new Error("Falta ffmpeg en OnniVers.");
    }
    try {
      await this.run(
        ffmpeg,
        ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", outputPath],
        30_000,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/EBML|Invalid data|Error opening input/i.test(message)) {
        throw new Error("No pude leer el audio grabado. Habla durante el micrófono activo e inténtalo otra vez.");
      }
      throw error;
    }
  }

  async transcribePayload(payload) {
    if (!this.isReady()) {
      throw new Error("Whisper no está instalado en este OnniVers. Vuelve a generar el .exe.");
    }

    const audioBase64 = String(payload?.audioBase64 ?? "").trim();
    if (!audioBase64) {
      throw new Error("Audio vacío.");
    }

    const mimeType = String(payload?.mimeType ?? "audio/webm").trim() || "audio/webm";
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "onni-whisper-"));
    const inputPath = path.join(tempDir, `input.${ext}`);
    const wavPath = path.join(tempDir, "input.wav");

    try {
      const inputBuffer = Buffer.from(audioBase64, "base64");
      if (!isValidAudioBuffer(inputBuffer)) {
        throw new Error("Audio incompleto. Mantén el micrófono activo y habla un poco más.");
      }
      fs.writeFileSync(inputPath, inputBuffer);
      await this.convertToWav(inputPath, wavPath);

      const cli = this.getCliPath();
      const model = this.getModelPath();
      const { stdout } = await this.run(cli, [
        "-m",
        model,
        "-f",
        wavPath,
        "-l",
        "es",
        "-nt",
        "-np",
      ]);

      const text = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      return { text };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

module.exports = { WhisperEngine };
