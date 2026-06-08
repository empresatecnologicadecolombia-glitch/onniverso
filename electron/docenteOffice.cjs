const { ipcMain, Notification, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

/** @type {import("electron").BrowserWindow | null} */
let previewWindow = null;

function getPythonCandidates() {
  const envPath = process.env.ONNI_PYTHON_PATH?.trim();
  if (envPath) return [envPath];
  return process.platform === "win32"
    ? ["py -3", "py", "python3", "python"]
    : ["python3", "python"];
}

function resolvePythonScript() {
  const devScript = path.join(__dirname, "python", "onni_docente.py");
  if (fs.existsSync(devScript)) return devScript;
  const packaged = path.join(process.resourcesPath, "python", "onni_docente.py");
  if (fs.existsSync(packaged)) return packaged;
  return devScript;
}

function getClasesBasePath() {
  return path.join(os.homedir(), "Documents", "OnniVers", "Clases");
}

function spawnPythonJob(payload) {
  const scriptPath = resolvePythonScript();
  const candidates = getPythonCandidates();

  return new Promise((resolve, reject) => {
    let index = 0;

    const tryNext = () => {
      if (index >= candidates.length) {
        reject(
          new Error(
            "No se encontró Python. Instala Python 3.11+ o define ONNI_PYTHON_PATH.",
          ),
        );
        return;
      }

      const candidate = candidates[index++];
      const parts = candidate.split(" ").filter(Boolean);
      const bin = parts[0];
      const extraArgs = parts.slice(1);

      const child = spawn(bin, [...extraArgs, scriptPath], {
        cwd: path.dirname(scriptPath),
        env: {
          ...process.env,
          ONNI_CLASES_BASE: getClasesBasePath(),
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", () => {
        if (settled) return;
        tryNext();
      });

      child.on("close", (code) => {
        if (settled) return;
        if (code !== 0 && !stdout.trim()) {
          tryNext();
          return;
        }
        settled = true;
        try {
          const lines = stdout.trim().split("\n").filter(Boolean);
          const last = lines[lines.length - 1] ?? "{}";
          const parsed = JSON.parse(last);
          if (code !== 0 && parsed.ok !== true) {
            reject(new Error(parsed.mensaje || stderr || `Python salió con código ${code}`));
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(new Error(stderr || stdout || String(error)));
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    };

    tryNext();
  });
}

function openPreviewWindow(folderPath, getMainWindow) {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.focus();
    void previewWindow.loadFile(path.join(__dirname, "docente-preview.html"), {
      query: { folder: folderPath },
    });
    return previewWindow;
  }

  previewWindow = new BrowserWindow({
    width: 960,
    height: 720,
    title: "OnniVers — Revisar clase",
    autoHideMenuBar: true,
    parent: getMainWindow?.() ?? undefined,
    modal: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void previewWindow.loadFile(path.join(__dirname, "docente-preview.html"), {
    query: { folder: folderPath },
  });

  previewWindow.on("closed", () => {
    previewWindow = null;
  });

  return previewWindow;
}

/**
 * @param {{ getMainWindow: () => import("electron").BrowserWindow | null }} deps
 */
function registerDocenteOfficeIPC(deps) {
  ipcMain.handle("onnivers:docente:getBasePath", () => getClasesBasePath());

  ipcMain.handle("onnivers:docente:execute", async (_event, payload) => {
    const job = payload && typeof payload === "object" ? payload : {};
    const accion = job.accion || job.flujo;
    const electronActions = new Set([
      "abrir_carpeta",
      "abrir_archivo",
      "mostrar_notificacion",
      "abrir_ventana_preview",
      "abrir_clase_web",
      "reproducir_video",
    ]);

    if (accion && electronActions.has(accion)) {
      return handleElectronAction(accion, job.params || {}, deps);
    }

    if (job.tipo === "flujo" || job.flujo) {
      return spawnPythonJob({ v: 1, tipo: "flujo", ...job });
    }

    if (job.tipo === "secuencia" || Array.isArray(job.pasos)) {
      return spawnPythonJob({ v: 1, tipo: "secuencia", ...job });
    }

    return spawnPythonJob({ v: 1, tipo: "accion", ...job });
  });
}

async function handleElectronAction(accion, params, deps) {
  const base = getClasesBasePath();

  if (accion === "abrir_carpeta") {
    const folder = path.resolve(params.carpeta || params.ruta || base);
    const err = await shell.openPath(folder);
    return {
      ok: !err,
      accion,
      carpeta: folder,
      mensaje: err ? `No se pudo abrir: ${err}` : "Carpeta abierta",
    };
  }

  if (accion === "abrir_archivo") {
    const filePath = path.resolve(params.archivo || params.ruta || "");
    const err = await shell.openPath(filePath);
    return {
      ok: !err,
      accion,
      archivos: [filePath],
      mensaje: err ? `No se pudo abrir: ${err}` : "Archivo abierto",
    };
  }

  if (accion === "mostrar_notificacion") {
    const title = String(params.titulo || "OnniVers");
    const body = String(params.mensaje || params.body || "Listo");
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
    return { ok: true, accion, mensaje: body };
  }

  if (accion === "abrir_ventana_preview") {
    const folder = path.resolve(params.carpeta || params.carpeta_clase || base);
    openPreviewWindow(folder, deps.getMainWindow);
    return { ok: true, accion, carpeta: folder, mensaje: "Ventana de revisión abierta" };
  }

  if (accion === "abrir_clase_web") {
    const slug = String(params.slug || "").trim();
    const url = slug
      ? `https://onnivers.com/coliseo?class=${encodeURIComponent(slug)}`
      : "https://onnivers.com/docente-clases";
    const win = deps.getMainWindow();
    if (win && !win.isDestroyed()) {
      await win.loadURL(url);
    }
    return { ok: true, accion, mensaje: "Navegando en OnniVers", url };
  }

  if (accion === "reproducir_video") {
    const filePath = path.resolve(params.archivo || params.ruta || "");
    const err = await shell.openPath(filePath);
    return {
      ok: !err,
      accion,
      archivos: [filePath],
      mensaje: err ? err : "Reproduciendo con el reproductor del sistema",
    };
  }

  return { ok: false, accion, mensaje: `Acción Electron desconocida: ${accion}` };
}

module.exports = {
  registerDocenteOfficeIPC,
  getClasesBasePath,
};
