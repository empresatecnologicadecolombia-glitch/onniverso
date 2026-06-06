const { app, BrowserWindow, shell, session, systemPreferences, ipcMain } = require("electron");
const path = require("node:path");
const { WinSpeechEngine } = require("./winSpeechEngine.cjs");

const START_URL = process.env.ONNIVERS_URL || "https://onnivers.com";

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
  "geolocation",
]);

/** @type {import("electron").BrowserWindow | null} */
let mainWindow = null;
/** @type {WinSpeechEngine | null} */
let winSpeechEngine = null;

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

function getWinSpeechEngine() {
  if (process.platform !== "win32") return null;
  if (!winSpeechEngine) {
    winSpeechEngine = new WinSpeechEngine(mainWindow?.webContents ?? null);
  } else if (mainWindow?.webContents) {
    winSpeechEngine.setWebContents(mainWindow.webContents);
  }
  return winSpeechEngine;
}

function registerVoiceIpc() {
  ipcMain.handle("onnivers:voice:isAvailable", async () => {
    const engine = getWinSpeechEngine();
    if (!engine) return false;
    return engine.probe();
  });

  ipcMain.handle("onnivers:voice:start", async () => {
    const engine = getWinSpeechEngine();
    if (!engine) return false;
    return engine.start();
  });

  ipcMain.handle("onnivers:voice:stop", async () => {
    const engine = getWinSpeechEngine();
    if (!engine) return false;
    engine.stop();
    return true;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "OnniVers",
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icons", "icon.ico"),
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
    mainWindow?.show();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    getWinSpeechEngine()?.setWebContents(mainWindow.webContents);
  });

  void mainWindow.loadURL(START_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    getWinSpeechEngine()?.setWebContents(null);
  });
}

app.commandLine.appendSwitch("enable-features", "WebRtcAllowInputVolumeAdjustment");
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");

app.whenReady().then(async () => {
  configureMediaPermissions(session.defaultSession);
  registerVoiceIpc();
  await ensureOsMediaAccess();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  winSpeechEngine?.dispose();
  winSpeechEngine = null;
  if (process.platform !== "darwin") {
    app.quit();
  }
});
