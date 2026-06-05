const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("onniversDesktop", {
  platform: process.platform,
  version: "1.0.0",
  isDesktopApp: true,
});
