import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishDir = path.join(root, "electron", "whisper", "publish");
const zipPath = path.join(publishDir, "whisper-bin-x64.zip");
const WHISPER_ZIP_URL =
  "https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.3/whisper-bin-x64.zip";
const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin";
const MODEL_NAME = "ggml-small.bin";

function log(message) {
  console.log(`[onni-whisper] ${message}`);
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

function extractZip(zipFile, targetDir) {
  if (fs.existsSync(path.join(targetDir, "whisper-cli.exe"))) {
    log("whisper-cli.exe ya extraído.");
    return;
  }
  fs.mkdirSync(targetDir, { recursive: true });
  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Expand-Archive -Path '${zipFile.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      throw new Error("No se pudo extraer whisper-bin-x64.zip");
    }
    return;
  }
  throw new Error("setup-whisper solo está automatizado en Windows.");
}

function findWhisperCli(dir) {
  /** @type {string | null} */
  let best = null;
  let bestSize = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && /^whisper-cli\.exe$|^main\.exe$/i.test(entry.name)) {
      const size = fs.statSync(full).size;
      if (size > bestSize) {
        best = full;
        bestSize = size;
      }
      continue;
    }
    if (entry.isDirectory()) {
      const nested = findWhisperCli(full);
      if (nested) {
        const size = fs.statSync(nested).size;
        if (size > bestSize) {
          best = nested;
          bestSize = size;
        }
      }
    }
  }
  return best;
}

function flattenWhisperBinaries(dir) {
  const cli = findWhisperCli(dir);
  if (!cli) {
    throw new Error("No se encontró whisper-cli.exe tras extraer el zip.");
  }
  const target = path.join(dir, "whisper-cli.exe");
  if (path.resolve(cli) !== path.resolve(target)) {
    fs.copyFileSync(cli, target);
  }
  log(`Whisper CLI: ${target}`);
}

function copyFfmpeg() {
  if (!ffmpegStatic || !fs.existsSync(ffmpegStatic)) {
    throw new Error("ffmpeg-static no disponible. Ejecuta npm install.");
  }
  const target = path.join(publishDir, "ffmpeg.exe");
  fs.copyFileSync(ffmpegStatic, target);
  log(`ffmpeg: ${target}`);
}

async function main() {
  fs.mkdirSync(publishDir, { recursive: true });
  await download(WHISPER_ZIP_URL, zipPath);
  extractZip(zipPath, publishDir);
  flattenWhisperBinaries(publishDir);
  await download(MODEL_URL, path.join(publishDir, MODEL_NAME));
  copyFfmpeg();
  log("Listo.");
}

main().catch((error) => {
  console.error(`[onni-whisper] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
