import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishDir = path.join(root, "electron", "llama", "publish");
const zipPath = path.join(publishDir, "llama-bin-win-cpu-x64.zip");
const LLAMA_ZIP_URL =
  "https://github.com/ggml-org/llama.cpp/releases/download/b9982/llama-b9982-bin-win-cpu-x64.zip";
const MODEL_URL =
  "https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF/resolve/main/google_gemma-3-1b-it-Q4_K_M.gguf";
const ONNI_BRAIN_MODEL = "onni-cerebro-v1.gguf";

function log(message) {
  console.log(`[onni-cerebro] ${message}`);
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024 * 1024) {
    log(`Usando ${path.basename(dest)} existente.`);
    return;
  }
  log(`Descargando ${url} ...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  log(`Guardado ${dest} (${Math.round(buffer.length / 1024 / 1024)} MB)`);
}

function isLlamaRuntimeReady(dir) {
  const server = path.join(dir, "llama-server.exe");
  const impl = path.join(dir, "llama-server-impl.dll");
  const dll = path.join(dir, "ggml.dll");
  return fs.existsSync(server) && fs.existsSync(impl) && fs.existsSync(dll);
}

function findBinary(dir, names) {
  /** @type {string | null} */
  let best = null;
  let bestSize = 0;
  const visit = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const full = path.join(currentDir, entry.name);
      if (entry.isFile() && names.includes(entry.name)) {
        const size = fs.statSync(full).size;
        if (size > bestSize) {
          best = full;
          bestSize = size;
        }
      } else if (entry.isDirectory()) {
        visit(full);
      }
    }
  };
  visit(dir);
  return best;
}

function installLlamaRuntime(sourceRoot, targetDir) {
  const server = findBinary(sourceRoot, ["llama-server.exe"]);
  if (!server) {
    throw new Error("No se encontró llama-server.exe tras extraer el zip.");
  }
  const sourceDir = path.dirname(server);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir)) {
    const lower = entry.toLowerCase();
    if (!/\.(dll|exe)$/i.test(lower)) continue;
    fs.copyFileSync(path.join(sourceDir, entry), path.join(targetDir, entry));
  }
  log(`llama-server + DLLs: ${targetDir}`);
}

function extractZip(zipFile, targetDir) {
  if (isLlamaRuntimeReady(targetDir)) {
    log("Runtime llama.cpp listo (llama-server + DLLs).");
    return;
  }

  log("Extrayendo llama-bin-win-cpu-x64.zip...");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "onni-llama-extract-"));
  try {
    if (process.platform !== "win32") {
      throw new Error("setup-llama solo está automatizado en Windows.");
    }
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Expand-Archive -Path '${zipFile.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      throw new Error("No se pudo extraer llama-bin-win-cpu-x64.zip");
    }
    installLlamaRuntime(tempDir, targetDir);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (!isLlamaRuntimeReady(targetDir)) {
    throw new Error("llama.cpp incompleto tras la extracción. Revisa ggml.dll y llama-server.exe.");
  }
}

async function installBrainModel() {
  const target = path.join(publishDir, ONNI_BRAIN_MODEL);
  if (fs.existsSync(target) && fs.statSync(target).size > 50_000_000) {
    log(`Usando ${ONNI_BRAIN_MODEL} existente.`);
    return;
  }
  const temp = path.join(publishDir, "google_gemma-3-1b-it-Q4_K_M.gguf.download");
  await download(MODEL_URL, temp);
  fs.copyFileSync(temp, target);
  log(`Cerebro de Onni empaquetado como ${ONNI_BRAIN_MODEL}.`);
  try {
    fs.rmSync(temp, { force: true });
  } catch {
    /* ignore */
  }
}

async function main() {
  fs.mkdirSync(publishDir, { recursive: true });
  await download(LLAMA_ZIP_URL, zipPath);
  extractZip(zipPath, publishDir);
  await installBrainModel();
  log(`Listo (cerebro ${ONNI_BRAIN_MODEL}).`);
}

main().catch((error) => {
  console.error(`[onni-cerebro] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
