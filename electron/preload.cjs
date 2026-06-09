const { contextBridge, ipcRenderer, clipboard } = require("electron");

contextBridge.exposeInMainWorld("onniversDesktop", {
  platform: process.platform,
  version: "1.0.0",
  isDesktopApp: true,
  clipboard: {
    writeText: (text) => Promise.resolve(clipboard.writeText(String(text ?? ""))),
  },
  docenteOffice: {
    getBasePath: () => ipcRenderer.invoke("onnivers:docente:getBasePath"),
    execute: (payload) => ipcRenderer.invoke("onnivers:docente:execute", payload),
  },
});
