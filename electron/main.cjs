const { app, BrowserWindow, shell, session, systemPreferences, nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { registerDocenteOfficeIPC } = require("./docenteOffice.cjs");

const START_URL = process.env.ONNIVERS_URL || "https://onnivers.com";

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

function createWindow() {
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

  void mainWindow.loadURL(START_URL);

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
  configureMediaPermissions(session.defaultSession);
  registerDocenteOfficeIPC({
    getMainWindow: () => mainWindow,
  });
  await ensureOsMediaAccess();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
