import fs from "node:fs";
import path from "node:path";
import { rcedit } from "rcedit";

const iconPath = path.resolve("electron/icons/icon.ico");
const exePath = path.resolve("release/win-unpacked/OnniVers.exe");

if (!fs.existsSync(iconPath)) {
  console.error("Falta el icono. Ejecuta: npm run desktop:icon");
  process.exit(1);
}

if (!fs.existsSync(exePath)) {
  console.warn("Sin ejecutable empaquetado; icono .ico listo para el próximo build:", iconPath);
  process.exit(0);
}

const beforeSize = fs.statSync(exePath).size;
await rcedit(exePath, {
  icon: iconPath,
  "product-name": "OnniVers",
  "file-description": "OnniVers — Tu Realidad Evolucionada",
});
const afterSize = fs.statSync(exePath).size;

if (afterSize < 1_000_000) {
  console.error("ERROR: el .exe quedó corrupto tras aplicar icono. Restaura desde un build limpio.");
  process.exit(1);
}

console.log("Icono embebido en OnniVers.exe (barra de tareas + escritorio):", exePath);
