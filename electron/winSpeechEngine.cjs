const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

/** @typedef {{ type: string; text?: string; isFinal?: boolean; code?: string; message?: string | null; language?: string }} WinSpeechEvent */

class WinSpeechEngine {
  /** @param {import("electron").WebContents | null} webContents */
  constructor(webContents) {
    this.webContents = webContents;
    /** @type {import("node:child_process").ChildProcess | null} */
    this.activeProcess = null;
    /** @type {boolean | null} */
    this.availableCache = null;
  }

  setWebContents(webContents) {
    this.webContents = webContents;
  }

  getHelperPath() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "onni-win-speech.exe");
    }
    const publishPath = path.join(__dirname, "onni-win-speech", "publish", "onni-win-speech.exe");
    const devPath = path.join(
      __dirname,
      "onni-win-speech",
      "bin",
      "Release",
      "net8.0-windows10.0.19041.0",
      "win-x64",
      "onni-win-speech.exe",
    );
    if (fs.existsSync(publishPath)) return publishPath;
    if (fs.existsSync(devPath)) return devPath;
    return publishPath;
  }

  /** @param {WinSpeechEvent} payload */
  dispatch(payload) {
    if (!this.webContents || this.webContents.isDestroyed()) return;
    const name =
      payload.type === "start"
        ? "voice:start"
        : payload.type === "result"
          ? "voice:result"
          : payload.type === "error"
            ? "voice:error"
            : payload.type === "end"
              ? "voice:end"
              : null;
    if (!name) return;

    const detail =
      payload.type === "result"
        ? { text: payload.text ?? "", isFinal: payload.isFinal !== false }
        : payload.type === "error"
          ? { code: payload.code ?? "unknown", message: payload.message ?? null }
          : undefined;

    this.webContents.send("onnivers:voice:event", { name, detail });
  }

  /** @param {string} chunk */
  consumeStdout(chunk) {
    for (const line of chunk.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        /** @type {WinSpeechEvent} */
        const payload = JSON.parse(trimmed);
        this.dispatch(payload);
      } catch {
        /* ignore malformed lines */
      }
    }
  }

  async probe() {
    if (this.availableCache !== null) return this.availableCache;
    if (process.platform !== "win32") {
      this.availableCache = false;
      return false;
    }

    const helper = this.getHelperPath();
    if (!fs.existsSync(helper)) {
      this.availableCache = false;
      return false;
    }

    this.availableCache = await new Promise((resolve) => {
      const child = spawn(helper, ["probe"], { windowsHide: true });
      let stdout = "";
      child.stdout.on("data", (buf) => {
        stdout += buf.toString("utf8");
      });
      child.on("close", (code) => {
        resolve(code === 0 && stdout.includes('"type":"available"'));
      });
      child.on("error", () => resolve(false));
    });

    return this.availableCache;
  }

  async start() {
    if (process.platform !== "win32") return false;
    const helper = this.getHelperPath();
    if (!fs.existsSync(helper)) return false;

    this.stop();

    const child = spawn(helper, ["once"], { windowsHide: true });
    this.activeProcess = child;

    child.stdout.on("data", (buf) => this.consumeStdout(buf.toString("utf8")));
    child.stderr.on("data", () => {
      /* ignore */
    });
    child.on("close", () => {
      if (this.activeProcess === child) {
        this.activeProcess = null;
      }
    });
    child.on("error", (error) => {
      this.dispatch({ type: "error", code: "start_failed", message: error.message });
      this.dispatch({ type: "end" });
      if (this.activeProcess === child) {
        this.activeProcess = null;
      }
    });

    return true;
  }

  stop() {
    if (!this.activeProcess) return;
    try {
      this.activeProcess.kill();
    } catch {
      /* ignore */
    }
    this.activeProcess = null;
  }

  dispose() {
    this.stop();
    this.webContents = null;
  }
}

module.exports = { WinSpeechEngine };
