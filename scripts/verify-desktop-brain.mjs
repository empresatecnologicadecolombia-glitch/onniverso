import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishDir = path.join(root, "electron", "llama", "publish");
const MODEL = "onni-cerebro-v1.gguf";
const REQUIRED = ["llama-server.exe", "llama-server-impl.dll", "ggml.dll", MODEL];

function fail(message) {
  console.error(`[verify-desktop-brain] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(publishDir)) {
  fail(`Falta ${publishDir}. Ejecuta: npm run desktop:llama-build`);
}

for (const name of REQUIRED) {
  const full = path.join(publishDir, name);
  if (!fs.existsSync(full)) {
    fail(`Falta ${name} en electron/llama/publish. Ejecuta: npm run desktop:llama-build`);
  }
}

const modelPath = path.join(publishDir, MODEL);
const size = fs.statSync(modelPath).size;
if (size < 50_000_000) {
  fail(`${MODEL} está incompleto (${size} bytes). Ejecuta: npm run desktop:llama-build`);
}

console.log(
  `[verify-desktop-brain] OK — cerebro listo (${MODEL}, ${Math.round(size / 1024 / 1024)} MB)`,
);
