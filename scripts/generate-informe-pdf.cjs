const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const PDFDocument = (await import("pdfkit")).default;
  const root = path.join(__dirname, "..");
  const mdPath = path.join(root, "docs", "INFORME-COMPLETO-ONNIVERS.md");
  const pdfPath = path.join(root, "docs", "INFORME-COMPLETO-ONNIVERS.pdf");
  const md = fs.readFileSync(mdPath, "utf8");

  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const ensureSpace = (h = 24) => {
    if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  const writeHeading = (text, size, color) => {
    ensureSpace(size + 12);
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(size).fillColor(color).text(text, { width: pageWidth });
    doc.fillColor("#111111");
    doc.moveDown(0.3);
  };

  const writeParagraph = (text) => {
    doc.font("Helvetica").fontSize(10);
    const h = doc.heightOfString(text, { width: pageWidth });
    ensureSpace(h + 8);
    doc.text(text, { width: pageWidth, align: "justify" });
    doc.moveDown(0.2);
  };

  const writeTable = (rows) => {
    if (!rows.length) return;
    const cols = rows[0].length;
    const colWidth = pageWidth / cols;
    const cellPad = 4;
    const fontSize = 8.5;

    rows.forEach((row, rowIndex) => {
      doc.font(rowIndex === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
      const heights = row.map((cell) =>
        doc.heightOfString(String(cell), { width: colWidth - cellPad * 2 }),
      );
      const rowH = Math.max(...heights, 14) + cellPad * 2;
      ensureSpace(rowH + 6);

      const y = doc.y;
      let x = doc.page.margins.left;
      row.forEach((cell, i) => {
        if (rowIndex === 0) doc.save().rect(x, y, colWidth, rowH).fill("#ecfeff").restore();
        doc.rect(x, y, colWidth, rowH).stroke("#cbd5e1");
        doc
          .fillColor(rowIndex === 0 ? "#0e7490" : "#111111")
          .text(String(cell), x + cellPad, y + cellPad, {
            width: colWidth - cellPad * 2,
            align: "left",
          });
        x += colWidth;
      });
      doc.y = y + rowH;
      doc.x = doc.page.margins.left;
    });
    doc.moveDown(0.5);
  };

  const lines = md.split("\n");
  let tableRows = [];
  let inCode = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    if (line.startsWith("|")) {
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cells.length) tableRows.push(cells);
      continue;
    }

    if (tableRows.length) {
      writeTable(tableRows);
      tableRows = [];
    }

    if (line.startsWith("# ")) writeHeading(line.slice(2), 20, "#0e7490");
    else if (line.startsWith("## ")) writeHeading(line.slice(3), 14, "#155e75");
    else if (line.startsWith("### ")) writeHeading(line.slice(4), 11, "#164e63");
    else if (line === "---") {
      ensureSpace(10);
      doc.moveDown(0.2).strokeColor("#e2e8f0").moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.4);
    } else if (line.startsWith("- ")) writeParagraph("• " + line.slice(2).replace(/\*\*/g, ""));
    else if (line.trim() === "") doc.moveDown(0.15);
    else writeParagraph(line.replace(/\*\*/g, "").replace(/`/g, ""));
  }

  if (tableRows.length) writeTable(tableRows);

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  console.log("PDF generado:", pdfPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
