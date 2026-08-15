/**
 * Arranca el cerebro EXACTO del OnniVers instalado y deja el server en 8765.
 * Luego hace 3 chats. Log: %TEMP%\onni-brain-live.log
 */
const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const logPath = path.join(os.tmpdir(), "onni-brain-live.log");
const lines = [];
function log(msg) {
  const row = `[${new Date().toISOString()}] ${msg}`;
  lines.push(row);
  console.log(row);
}

const dir = path.join(process.env.LOCALAPPDATA, "Programs", "OnniVers", "resources", "llama");
const exe = path.join(dir, "llama-server.exe");
const model = path.join(dir, "onni-cerebro-v1.gguf");
const port = 8765;

function freePort() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of out.split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (pid > 0) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { windowsHide: true, stdio: "ignore" });
          log(`killed pid ${pid}`);
        } catch {}
      }
    }
  } catch {}
}

async function waitHealth(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function chat(text) {
  const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "onni-cerebro",
      stream: false,
      temperature: 0.4,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "Eres Onni. Cerebro local OnniVers PC. No eres Gemini. Si preguntan qué cerebro usas di: cerebro local onni-cerebro-v1.",
        },
        { role: "user", content: text },
      ],
    }),
  });
  const j = await res.json();
  return String(j?.choices?.[0]?.message?.content ?? "").trim();
}

(async () => {
  log(`dir=${dir}`);
  log(`exe=${fs.existsSync(exe)} model=${fs.existsSync(model)} size=${fs.existsSync(model) ? fs.statSync(model).size : 0}`);
  freePort();
  const child = spawn(
    exe,
    ["-m", model, "--host", "127.0.0.1", "--port", String(port), "-c", "2048", "-t", "4", "-ngl", "0", "--jinja"],
    { cwd: dir, windowsHide: true, stdio: ["ignore", "ignore", "pipe"], detached: true },
  );
  child.unref();
  let err = "";
  child.stderr?.on("data", (d) => {
    err += d.toString();
  });
  log(`spawned pid=${child.pid}`);
  const ok = await waitHealth();
  log(`health=${ok}`);
  if (!ok) {
    log(`stderr=${err.slice(-800)}`);
    fs.writeFileSync(logPath, lines.join("\n"));
    process.exit(1);
  }
  for (const q of ["que cerebro usas", "hola", "ya funciona?"]) {
    try {
      const a = await chat(q);
      log(`Q=${q} A=${a.slice(0, 160)}`);
    } catch (e) {
      log(`Q=${q} ERR=${e instanceof Error ? e.message : e}`);
    }
  }
  log(`LEFT_RUNNING pid=${child.pid} port=${port}`);
  fs.writeFileSync(logPath, lines.join("\n"));
  // keep server running for the app
  process.exit(0);
})().catch((e) => {
  log(String(e));
  fs.writeFileSync(logPath, lines.join("\n"));
  process.exit(1);
});
