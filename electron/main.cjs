const { app, BrowserWindow, shell, session, systemPreferences, nativeImage, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { WhisperEngine } = require("./whisperEngine.cjs");
const { PiperEngine } = require("./piperEngine.cjs");
const { LlamaEngine } = require("./llamaEngine.cjs");
const { startLocalWebServer } = require("./localWebServer.cjs");

if (process.platform === "win32") {
  app.setAppUserModelId("com.empresatecnologica.onnivers");
}

function getAppIconPath() {
  const packagedIcon = path.join(process.resourcesPath, "icon.ico");
  if (app.isPackaged && fs.existsSync(packagedIcon)) {
    return path.resolve(packagedIcon);
  }
  return path.resolve(path.join(__dirname, "icons", "icon.ico"));
}

function loadAppIcon() {
  const iconPath = getAppIconPath();
  if (!fs.existsSync(iconPath)) return null;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? null : image;
}

function getBundledWebRoot() {
  if (app.isPackaged) {
    const packaged = path.join(process.resourcesPath, "web");
    if (fs.existsSync(path.join(packaged, "index.html"))) return packaged;
  }
  const devDist = path.resolve(path.join(__dirname, "..", "dist"));
  if (fs.existsSync(path.join(devDist, "index.html"))) return devDist;
  return null;
}

const ALLOWED_PERMISSIONS = new Set([
  "media",
  "microphone",
  "camera",
  "audioCapture",
  "videoCapture",
  "display-capture",
  "fullscreen",
  "pointerLock",
  "notifications",
  "speaker-selection",
  "window-management",
  "clipboard-read",
  "clipboard-write",
  "clipboard-sanitized-write",
  "geolocation",
]);

/** @type {import("electron").BrowserWindow | null} */
let mainWindow = null;
/** @type {WhisperEngine | null} */
let whisperEngine = null;
/** @type {PiperEngine | null} */
let piperEngine = null;
/** @type {LlamaEngine | null} */
let llamaEngine = null;
/** @type {{ url: string, close: () => Promise<void> } | null} */
let localWeb = null;

function getWhisperEngine() {
  if (process.platform !== "win32") return null;
  if (!whisperEngine) whisperEngine = new WhisperEngine();
  return whisperEngine;
}

function getPiperEngine() {
  if (process.platform !== "win32") return null;
  if (!piperEngine) piperEngine = new PiperEngine();
  return piperEngine;
}

function getLlamaEngine() {
  if (process.platform !== "win32") return null;
  if (!llamaEngine) llamaEngine = new LlamaEngine();
  return llamaEngine;
}

function registerLlamaIpc() {
  ipcMain.handle("onnivers:llama:isAvailable", () => {
    try {
      return Boolean(getLlamaEngine()?.isReady());
    } catch {
      return false;
    }
  });

  ipcMain.handle("onnivers:llama:chat", async (event, payload) => {
    const engine = getLlamaEngine();
    if (!engine) {
      return { text: "", error: "Cerebro de Onni solo está disponible en Windows." };
    }
    const requestId = String(payload?.requestId ?? "").trim();
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    try {
      const text = await engine.chat(messages, (partial) => {
        if (!requestId) return;
        event.sender.send("onnivers:llama:partial", { requestId, text: partial });
      });
      return { text: String(text ?? ""), error: "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[Onni cerebro] IPC chat falló:", message);
      return { text: "", error: message };
    }
  });
}

function registerWhisperIpc() {
  ipcMain.handle("onnivers:whisper:isAvailable", () => {
    try {
      return Boolean(getWhisperEngine()?.isReady());
    } catch {
      return false;
    }
  });

  ipcMain.handle("onnivers:whisper:transcribe", async (_event, payload) => {
    const engine = getWhisperEngine();
    if (!engine) {
      throw new Error("Whisper solo está disponible en Windows.");
    }
    return engine.transcribePayload(payload);
  });
}

function registerPiperIpc() {
  ipcMain.handle("onnivers:piper:isAvailable", () => {
    try {
      return Boolean(getPiperEngine()?.isReady());
    } catch {
      return false;
    }
  });

  ipcMain.handle("onnivers:piper:synthesize", async (_event, payload) => {
    const engine = getPiperEngine();
    if (!engine) {
      throw new Error("Piper solo está disponible en Windows.");
    }
    return engine.synthesize(String(payload?.text ?? ""));
  });
}

function isMediaPermission(permission, details) {
  if (ALLOWED_PERMISSIONS.has(permission)) return true;
  const mediaTypes = details?.mediaTypes;
  if (Array.isArray(mediaTypes) && mediaTypes.length > 0) {
    return mediaTypes.every((type) => type === "video" || type === "audio");
  }
  return false;
}

function configureMediaPermissions(sess) {
  sess.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const url = details?.requestingUrl ?? "";
    const isOnniVers =
      url.includes("onnivers.com") || url.includes("localhost") || url.includes("127.0.0.1");
    if (isOnniVers && isMediaPermission(permission, details)) {
      callback(true);
      return;
    }
    callback(isMediaPermission(permission, details));
  });

  sess.setPermissionCheckHandler((_webContents, permission, _origin, details) => {
    return isMediaPermission(permission, details);
  });

  sess.setDevicePermissionHandler((details) => {
    if (details.deviceType === "hid" || details.deviceType === "usb") {
      return false;
    }
    return true;
  });
}

async function ensureOsMediaAccess() {
  if (process.platform !== "darwin") return;
  try {
    await systemPreferences.askForMediaAccess("camera");
    await systemPreferences.askForMediaAccess("microphone");
  } catch {
    /* macOS only */
  }
}

async function resolveStartUrl() {
  const override = String(process.env.ONNIVERS_URL || "").trim();
  if (override) return override;

  const webRoot = getBundledWebRoot();
  if (webRoot) {
    localWeb = await startLocalWebServer(webRoot);
    return localWeb.url;
  }

  return "https://onnivers.com";
}

async function createWindow() {
  const iconPath = getAppIconPath();
  const icon = loadAppIcon();
  const windowIcon =
    process.platform === "win32" && fs.existsSync(iconPath) ? iconPath : icon ?? iconPath;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "OnniVers",
    show: false,
    autoHideMenuBar: true,
    icon: windowIcon,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (process.platform === "win32" && fs.existsSync(iconPath)) {
      mainWindow?.setIcon(iconPath);
    } else if (icon) {
      mainWindow?.setIcon(icon);
    }
    mainWindow?.show();
  });

  const startUrl = await resolveStartUrl();
  void mainWindow.loadURL(startUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch("enable-features", "WebRtcAllowInputVolumeAdjustment");
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");

app.whenReady().then(async () => {
  registerWhisperIpc();
  registerPiperIpc();
  registerLlamaIpc();
  configureMediaPermissions(session.defaultSession);
  await ensureOsMediaAccess();
  await createWindow();

  const brain = getLlamaEngine();
  if (brain?.isReady()) {
    void brain.ensureServerRunning().catch((error) => {
      console.warn("[Onni cerebro] precarga falló:", error instanceof Error ? error.message : error);
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  getLlamaEngine()?.stopServer();
  if (localWeb) {
    void localWeb.close();
    localWeb = null;
  }
});
