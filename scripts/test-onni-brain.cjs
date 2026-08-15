/**
 * Prueba rápida del cerebro local (sin Electron UI).
 * Uso: node scripts/test-onni-brain.mjs
 */
const path = require("node:path");
const fs = require("node:fs");

// Simula Electron app paths para LlamaEngine empaquetado vs dev.
const { app } = require("electron");
// Si se ejecuta con node puro, electron puede fallar — usamos lógica inline.

async function main() {
  const publish = path.join(__dirname, "..", "electron", "llama", "publish");
  const installed = path.join(
    process.env.LOCALAPPDATA || "",
    "Programs",
    "OnniVers",
    "resources",
    "llama",
  );
  const dir = fs.existsSync(path.join(installed, "onni-cerebro-v1.gguf")) ? installed : publish;
  const server = path.join(dir, "llama-server.exe");
  const model = path.join(dir, "onni-cerebro-v1.gguf");
  console.log("[test-brain] dir=", dir);
  console.log("[test-brain] server=", fs.existsSync(server), fs.existsSync(server) ? fs.statSync(server).size : 0);
  console.log("[test-brain] model=", fs.existsSync(model), fs.existsSync(model) ? fs.statSync(model).size : 0);

  if (!fs.existsSync(server) || !fs.existsSync(model)) {
    console.error("[test-brain] FALTAN archivos del cerebro");
    process.exit(1);
  }

  // Reusa LlamaEngine con monkeypatch de getLlamaDir vía env
  process.chdir(path.join(__dirname, ".."));
  const { LlamaEngine } = require("../electron/llamaEngine.cjs");

  // LlamaEngine usa electron.app — en node no existe. Parche mínimo:
  const Module = require("node:module");
  const electronMock = {
    app: {
      isPackaged: false,
      getAppPath: () => path.join(__dirname, ".."),
    },
  };
  require.cache[require.resolve("electron")] = {
    id: require.resolve("electron"),
    filename: require.resolve("electron"),
    loaded: true,
    exports: electronMock,
  };

  // Re-require engine with mock — actually llamaEngine already required electron at top.
  // Better: spawn llama-server manually and hit /v1/chat/completions
  const { spawn } = require("node:child_process");
  const port = 8766;
  const child = spawn(
    server,
    ["-m", model, "--host", "127.0.0.1", "--port", String(port), "-c", "2048", "-t", "4", "--jinja"],
    { cwd: dir, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  const deadline = Date.now() + 120_000;
  let healthy = false;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) {
        healthy = true;
        break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  if (!healthy) {
    console.error("[test-brain] NO arrancó llama-server");
    console.error(stderr.slice(-800));
    child.kill();
    process.exit(1);
  }
  console.log("[test-brain] server OK");

  const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "onni-cerebro",
      temperature: 0.2,
      max_tokens: 80,
      messages: [
        { role: "system", content: "Eres Onni. Responde en una frase: usas cerebro local, no Gemini." },
        { role: "user", content: "que cerebro usas?" },
      ],
    }),
  });
  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  console.log("[test-brain] respuesta=", text);
  child.kill();
  if (!text || String(text).trim().length < 3) {
    console.error("[test-brain] respuesta vacía");
    process.exit(1);
  }
  console.log("[test-brain] OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
