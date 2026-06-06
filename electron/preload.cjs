const { contextBridge, ipcRenderer } = require("electron");

const isWindows = process.platform === "win32";

ipcRenderer.on("onnivers:voice:event", (_event, payload) => {
  if (!payload?.name) return;
  window.dispatchEvent(new CustomEvent(payload.name, { detail: payload.detail }));
});

contextBridge.exposeInMainWorld("onniversDesktop", {
  platform: process.platform,
  version: "1.0.0",
  isDesktopApp: true,
  windowsNativeVoice: isWindows,
  voice: isWindows
    ? {
        isAvailable: () => ipcRenderer.invoke("onnivers:voice:isAvailable"),
        startListening: () => ipcRenderer.invoke("onnivers:voice:start"),
        stopListening: () => ipcRenderer.invoke("onnivers:voice:stop"),
      }
    : undefined,
});
