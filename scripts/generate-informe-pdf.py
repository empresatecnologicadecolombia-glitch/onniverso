#!/usr/bin/env python3
"""Generate OnniVers report PDF from markdown source."""

from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    from xhtml2pdf import pisa
except ImportError:
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "xhtml2pdf", "-q"])
    from xhtml2pdf import pisa

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "informe-onnivers-2026.md"
PDF_PATH = ROOT / "docs" / "informe-onnivers-2026.pdf"


def md_to_html(md: str) -> str:
    lines = md.splitlines()
    html_parts: list[str] = []
    in_table = False
    in_list = False
    list_type = "ul"
    in_code = False
    code_lines: list[str] = []

    def close_list():
        nonlocal in_list
        if in_list:
            html_parts.append(f"</{list_type}>")
            in_list = False

    def close_table():
        nonlocal in_table
        if in_table:
            html_parts.append("</tbody></table>")
            in_table = False

    for raw in lines:
        line = raw.rstrip()

        if in_code:
            if line.strip() == "```":
                html_parts.append(
                    "<pre style='background:#f4f4f5;padding:12px;border-radius:6px;"
                    "font-size:9pt;white-space:pre-wrap;'>"
                    + "\n".join(code_lines)
                    + "</pre>"
                )
                in_code = False
                code_lines = []
            else:
                code_lines.append(line.replace("<", "&lt;").replace(">", "&gt;"))
            continue

        if line.strip().startswith("```"):
            close_list()
            close_table()
            in_code = True
            code_lines = []
            continue

        if not line.strip():
            close_list()
            close_table()
            continue

        if line.startswith("# "):
            close_list()
            close_table()
            html_parts.append(f"<h1>{inline(line[2:])}</h1>")
            continue
        if line.startswith("## "):
            close_list()
            close_table()
            html_parts.append(f"<h2>{inline(line[3:])}</h2>")
            continue
        if line.startswith("### "):
            close_list()
            close_table()
            html_parts.append(f"<h3>{inline(line[4:])}</h3>")
            continue

        if line.strip() == "---":
            close_list()
            close_table()
            html_parts.append("<hr/>")
            continue

        if "|" in line and line.strip().startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if all(re.match(r"^[-:]+$", c) for c in cells):
                continue
            if not in_table:
                close_list()
                html_parts.append(
                    "<table><thead><tr>"
                    + "".join(f"<th>{inline(c)}</th>" for c in cells)
                    + "</tr></thead><tbody>"
                )
                in_table = True
            else:
                html_parts.append(
                    "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in cells) + "</tr>"
                )
            continue

        if line.startswith("- "):
            close_table()
            if not in_list or list_type != "ul":
                close_list()
                html_parts.append("<ul>")
                in_list = True
                list_type = "ul"
            html_parts.append(f"<li>{inline(line[2:])}</li>")
            continue

        close_list()
        close_table()
        if line.startswith("*") and line.endswith("*") and not line.startswith("**"):
            html_parts.append(f"<p><em>{inline(line.strip('*'))}</em></p>")
        else:
            html_parts.append(f"<p>{inline(line)}</p>")

    close_list()
    close_table()
    return "\n".join(html_parts)


def inline(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    return text


def build_document(body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Informe OnniVers 2026</title>
  <style>
    @page {{
      size: A4;
      margin: 2cm 1.8cm;
      @frame footer {{
        -pdf-frame-content: footerContent;
        bottom: 0.6cm;
        margin-left: 1.8cm;
        margin-right: 1.8cm;
        height: 1cm;
      }}
    }}
    body {{
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      color: #111827;
    }}
    h1 {{
      font-size: 22pt;
      color: #0e7490;
      margin: 0 0 12pt 0;
      border-bottom: 2px solid #22d3ee;
      padding-bottom: 8pt;
    }}
    h2 {{
      font-size: 14pt;
      color: #155e75;
      margin: 18pt 0 8pt 0;
      page-break-after: avoid;
    }}
    h3 {{
      font-size: 11.5pt;
      color: #164e63;
      margin: 12pt 0 6pt 0;
      page-break-after: avoid;
    }}
    p {{ margin: 0 0 8pt 0; }}
    ul {{ margin: 0 0 10pt 16pt; padding: 0; }}
    li {{ margin-bottom: 4pt; }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0 14pt 0;
      font-size: 9pt;
    }}
    th, td {{
      border: 1px solid #d1d5db;
      padding: 6pt 8pt;
      vertical-align: top;
      text-align: left;
    }}
    th {{
      background: #ecfeff;
      color: #0f766e;
      font-weight: bold;
    }}
    tr:nth-child(even) td {{ background: #f9fafb; }}
    hr {{
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 14pt 0;
    }}
    code {{
      font-family: Courier, monospace;
      background: #f3f4f6;
      padding: 1pt 3pt;
      font-size: 9pt;
    }}
    strong {{ color: #0f172a; }}
    #footerContent {{
      font-size: 8pt;
      color: #6b7280;
      text-align: center;
    }}
  </style>
</head>
<body>
{body}
<div id="footerContent">OnniVers — Empresa Tecnológica de Colombia — Informe 2026</div>
</body>
</html>"""


def main() -> int:
    if not MD_PATH.exists():
        print(f"Missing markdown source: {MD_PATH}", file=sys.stderr)
        return 1

    md = MD_PATH.read_text(encoding="utf-8")
    html = build_document(md_to_html(md))
    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)

    with PDF_PATH.open("wb") as pdf_file:
        status = pisa.CreatePDF(html, dest=pdf_file, encoding="utf-8")

    if status.err:
        print("PDF generation failed", file=sys.stderr)
        return 1

    print(f"PDF created: {PDF_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
