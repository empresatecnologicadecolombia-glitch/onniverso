const { contextBridge, clipboard, ipcRenderer } = require("electron");

const isWindows = process.platform === "win32";

contextBridge.exposeInMainWorld("onniversDesktop", {
  platform: process.platform,
  version: "1.0.0",
  isDesktopApp: true,
  clipboard: {
    writeText: (text) => Promise.resolve(clipboard.writeText(String(text ?? ""))),
  },
  whisper: isWindows
    ? {
        isAvailable: () => ipcRenderer.invoke("onnivers:whisper:isAvailable"),
        transcribe: (payload) => ipcRenderer.invoke("onnivers:whisper:transcribe", payload),
      }
    : undefined,
  piper: isWindows
    ? {
        isAvailable: () => ipcRenderer.invoke("onnivers:piper:isAvailable"),
        synthesize: (payload) => ipcRenderer.invoke("onnivers:piper:synthesize", payload),
      }
    : undefined,
  brain: isWindows
    ? {
        isAvailable: () => ipcRenderer.invoke("onnivers:llama:isAvailable"),
        chat: (payload) => ipcRenderer.invoke("onnivers:llama:chat", payload),
        onPartial: (callback) => {
          const listener = (_event, data) => {
            callback(String(data?.requestId ?? ""), String(data?.text ?? ""));
          };
          ipcRenderer.on("onnivers:llama:partial", listener);
          return () => ipcRenderer.removeListener("onnivers:llama:partial", listener);
        },
      }
    : undefined,
});
