const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("onniversDesktop", {
  platform: process.platform,
  version: "1.0.0",
  isDesktopApp: true,
  docenteOffice: {
    getBasePath: () => ipcRenderer.invoke("onnivers:docente:getBasePath"),
    execute: (payload) => ipcRenderer.invoke("onnivers:docente:execute", payload),
  },
});
