const { contextBridge, clipboard } = require("electron");

contextBridge.exposeInMainWorld("onniversDesktop", {
  platform: process.platform,
  version: "1.0.0",
  isDesktopApp: true,
  clipboard: {
    writeText: (text) => Promise.resolve(clipboard.writeText(String(text ?? ""))),
  },
});
