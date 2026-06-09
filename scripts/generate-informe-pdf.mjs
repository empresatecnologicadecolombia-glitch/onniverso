import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mdPath = join(root, "docs", "INFORME-COMPLETO-ONNIVERS.md");
const pdfPath = join(root, "docs", "INFORME-COMPLETO-ONNIVERS.pdf");

function mdToHtml(md) {
  const lines = md.split("\n");
  let html = "";
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    html += "<table>";
    tableRows.forEach((row, i) => {
      const tag = i === 0 ? "th" : "td";
      const cells = row.split("|").filter((c) => c.trim()).map((c) => c.trim());
      if (cells.length) {
        html += "<tr>" + cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join("") + "</tr>";
      }
    });
    html += "</table>";
    tableRows = [];
    inTable = false;
  };

  const inline = (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  for (const line of lines) {
    if (line.startsWith("|")) {
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
      inTable = true;
      tableRows.push(line);
      continue;
    }
    if (inTable) flushTable();

    if (line.startsWith("# ")) html += `<h1>${inline(line.slice(2))}</h1>`;
    else if (line.startsWith("## ")) html += `<h2>${inline(line.slice(3))}</h2>`;
    else if (line.startsWith("### ")) html += `<h3>${inline(line.slice(4))}</h3>`;
    else if (line.startsWith("---")) html += "<hr/>";
    else if (line.startsWith("```")) continue;
    else if (line.trim() === "") html += "<br/>";
    else if (line.startsWith("- ")) html += `<li>${inline(line.slice(2))}</li>`;
    else if (line.startsWith("*")) html += `<p><em>${inline(line.replace(/^\*|\*$/g, ""))}</em></p>`;
    else html += `<p>${inline(line)}</p>`;
  }
  if (inTable) flushTable();
  return html;
}

const md = readFileSync(mdPath, "utf8");
const body = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Informe Completo OnniVers</title>
<style>
  @page { margin: 18mm 14mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #111; line-height: 1.45; font-size: 11pt; }
  h1 { color: #0e7490; font-size: 22pt; border-bottom: 3px solid #22d3ee; padding-bottom: 8px; margin-top: 0; }
  h2 { color: #155e75; font-size: 15pt; margin-top: 22px; page-break-after: avoid; }
  h3 { color: #164e63; font-size: 12pt; margin-top: 16px; }
  p, li { margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #ecfeff; color: #0e7490; }
  tr:nth-child(even) td { background: #f8fafc; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  a { color: #0891b2; text-decoration: none; }
</style>
</head>
<body>${body}</body>
</html>`;

const htmlPath = join(root, "docs", "INFORME-COMPLETO-ONNIVERS.html");
writeFileSync(htmlPath, fullHtml, "utf8");

await app.whenReady();

const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
await win.loadFile(htmlPath);
const pdf = await win.webContents.printToPDF({
  printBackground: true,
  margins: { marginType: "default" },
  pageSize: "A4",
});
writeFileSync(pdfPath, pdf);
await win.close();
app.quit();

console.log("PDF generado:", pdfPath);
