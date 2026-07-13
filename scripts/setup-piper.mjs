import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishDir = path.join(root, "electron", "piper", "publish");
const zipPath = path.join(publishDir, "piper_windows_amd64.zip");
const PIPER_ZIP_URL =
  "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip";
const VOICE_BASE =
  "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_MX/claude/high";
const VOICE_ONNX = "es_MX-claude-high.onnx";
const VOICE_JSON = "es_MX-claude-high.onnx.json";

/** Voces antiguas que ya no usamos: se borran para no inflar el instalador. */
const OBSOLETE_VOICES = [
  "es_ES-sharvard-medium.onnx",
  "es_ES-sharvard-medium.onnx.json",
  "es_ES-davefx-medium.onnx",
  "es_ES-davefx-medium.onnx.json",
];

function log(message) {
  console.log(`[onni-piper] ${message}`);
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
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

function isPiperRuntimeReady(dir) {
  const exe = path.join(dir, "piper.exe");
  const espeakTab = path.join(dir, "espeak-ng-data", "phontab");
  return (
    fs.existsSync(exe) &&
    fs.statSync(exe).size > 50_000 &&
    fs.existsSync(espeakTab)
  );
}

function findPiperExe(dir) {
  /** @type {string | null} */
  let best = null;
  let bestSize = 0;
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isFile() && /^piper\.exe$/i.test(entry.name)) {
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

function installPiperRuntime(sourceRoot, targetDir) {
  const exe = findPiperExe(sourceRoot);
  if (!exe) {
    throw new Error("No se encontró piper.exe tras extraer el zip.");
  }
  const sourceDir = path.dirname(exe);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir)) {
    const full = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      fs.cpSync(full, dest, { recursive: true });
      continue;
    }
    if (!stat.isFile()) continue;
    fs.copyFileSync(full, dest);
  }
  log(`Piper runtime: ${targetDir}`);
}

function extractZip(zipFile, targetDir) {
  if (isPiperRuntimeReady(targetDir)) {
    log("Runtime Piper listo.");
    return;
  }

  log("Extrayendo piper_windows_amd64.zip...");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "onni-piper-extract-"));
  try {
    if (process.platform !== "win32") {
      throw new Error("setup-piper solo está automatizado en Windows.");
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
      throw new Error("No se pudo extraer piper_windows_amd64.zip");
    }
    installPiperRuntime(tempDir, targetDir);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (!isPiperRuntimeReady(targetDir)) {
    throw new Error("Piper incompleto tras la extracción. Revisa piper.exe.");
  }
}

function removeObsoleteVoices() {
  for (const name of OBSOLETE_VOICES) {
    const full = path.join(publishDir, name);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { force: true });
      log(`Borrada voz vieja: ${name}`);
    }
  }
}

async function main() {
  fs.mkdirSync(publishDir, { recursive: true });
  await download(PIPER_ZIP_URL, zipPath);
  extractZip(zipPath, publishDir);
  removeObsoleteVoices();
  await download(`${VOICE_BASE}/${VOICE_ONNX}`, path.join(publishDir, VOICE_ONNX));
  await download(`${VOICE_BASE}/${VOICE_JSON}`, path.join(publishDir, VOICE_JSON));
  log(`Listo (voz ${VOICE_ONNX}).`);
}

main().catch((error) => {
  console.error(`[onni-piper] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
