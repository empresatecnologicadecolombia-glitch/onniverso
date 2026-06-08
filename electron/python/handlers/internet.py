from __future__ import annotations

import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable

from .paths import default_class_folder, ensure_class_layout


def _fetch_url(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "OnniVers-Docente/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def buscar_informacion(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or params.get("consulta") or "").strip()
    if not tema:
        return {"ok": False, "accion": "buscar_informacion", "mensaje": "Falta tema"}
    query = urllib.parse.quote(tema)
    url = f"https://es.wikipedia.org/api/rest_v1/page/summary/{query}"
    try:
        data = _fetch_url(url)
        import json

        parsed = json.loads(data.decode("utf-8"))
        resumen = parsed.get("extract") or parsed.get("description") or ""
        page_url = parsed.get("content_urls", {}).get("desktop", {}).get("page") or ""
        return {
            "ok": True,
            "accion": "buscar_informacion",
            "tema": tema,
            "resumen": resumen,
            "url": page_url,
            "mensaje": "Información encontrada (Wikipedia)",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": True,
            "accion": "buscar_informacion",
            "tema": tema,
            "resumen": "",
            "url": f"https://www.google.com/search?q={query}",
            "mensaje": f"Sin resumen automático: {exc}",
        }


def buscar_pdf_en_internet(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or "").strip()
    query = urllib.parse.quote(f"{tema} filetype:pdf")
    url = f"https://www.google.com/search?q={query}"
    return {
        "ok": True,
        "accion": "buscar_pdf_en_internet",
        "tema": tema,
        "url": url,
        "mensaje": "Abre el enlace y descarga el PDF manualmente o usa descargar_pdf con URL directa",
    }


def descargar_pdf(params: dict[str, Any]) -> dict[str, Any]:
    url = str(params.get("url") or "").strip()
    if not url:
        return {"ok": False, "accion": "descargar_pdf", "mensaje": "Falta url"}
    root = Path(params.get("carpeta_clase") or default_class_folder(str(params.get("tema") or "recursos")))
    ensure_class_layout(root)
    dest_dir = root / "03_documentos"
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = Path(urllib.parse.urlparse(url).path).name or "documento.pdf"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    dest = dest_dir / name
    try:
        dest.write_bytes(_fetch_url(url))
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "accion": "descargar_pdf", "mensaje": str(exc)}
    return {
        "ok": True,
        "accion": "descargar_pdf",
        "carpeta": str(root),
        "archivos": [str(dest)],
        "primero": str(dest),
        "mensaje": "PDF descargado",
    }


def descargar_imagenes(params: dict[str, Any]) -> dict[str, Any]:
    url = str(params.get("url") or "").strip()
    root = Path(params.get("carpeta_clase") or default_class_folder(str(params.get("tema") or "imagenes")))
    ensure_class_layout(root)
    dest_dir = root / "04_imagenes"
    dest_dir.mkdir(parents=True, exist_ok=True)
    if not url:
        return {"ok": False, "accion": "descargar_imagenes", "mensaje": "Falta url"}
    ext = Path(urllib.parse.urlparse(url).path).suffix or ".jpg"
    dest = dest_dir / f"imagen{ext}"
    try:
        dest.write_bytes(_fetch_url(url))
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "accion": "descargar_imagenes", "mensaje": str(exc)}
    return {"ok": True, "accion": "descargar_imagenes", "carpeta": str(root), "archivos": [str(dest)], "mensaje": "Imagen descargada"}


def descargar_video(params: dict[str, Any]) -> dict[str, Any]:
    urls = params.get("urls") or params.get("youtube_urls") or []
    if isinstance(urls, str):
        urls = [urls]
    url = str(params.get("url") or (urls[0] if urls else "")).strip()
    if not url:
        return {"ok": False, "accion": "descargar_video", "mensaje": "Falta URL de video"}

    root = Path(params.get("carpeta_clase") or default_class_folder(str(params.get("tema") or "video")))
    ensure_class_layout(root)
    out_dir = root / "01_originales"
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        import subprocess
        import sys

        out_tpl = str(out_dir / "video.%(ext)s")
        cmd = [
            sys.executable,
            "-m",
            "yt_dlp",
            "-f",
            "bv*+ba/b",
            "--merge-output-format",
            "mp4",
            "-o",
            out_tpl,
            url,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if proc.returncode != 0:
            return {
                "ok": False,
                "accion": "descargar_video",
                "mensaje": proc.stderr or proc.stdout or "yt-dlp falló. pip install yt-dlp",
            }
        files = sorted(out_dir.glob("video*.mp4")) or sorted(out_dir.glob("*.mp4"))
        if not files:
            return {"ok": False, "accion": "descargar_video", "mensaje": "No se generó archivo mp4"}
        return {
            "ok": True,
            "accion": "descargar_video",
            "carpeta": str(root),
            "archivos": [str(files[-1])],
            "origen": str(files[-1]),
            "mensaje": "Video descargado",
        }
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "accion": "descargar_video", "mensaje": f"{exc}. Instala: pip install yt-dlp"}


def abrir_enlace(params: dict[str, Any]) -> dict[str, Any]:
    url = str(params.get("url") or "").strip()
    if not re.match(r"^https?://", url):
        return {"ok": False, "accion": "abrir_enlace", "mensaje": "URL inválida"}
    return {"ok": True, "accion": "abrir_enlace", "url": url, "delegar_electron": True, "mensaje": "Abrir en navegador"}


def extraer_web(params: dict[str, Any]) -> dict[str, Any]:
    url = str(params.get("url") or "").strip()
    if not url:
        return {"ok": False, "accion": "extraer_web", "mensaje": "Falta url"}
    try:
        html = _fetch_url(url).decode("utf-8", errors="ignore")
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        return {"ok": True, "accion": "extraer_web", "texto": text[:8000], "url": url, "mensaje": "Contenido extraído"}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "accion": "extraer_web", "mensaje": str(exc)}


ACTIONS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "buscar_informacion": buscar_informacion,
    "buscar_pdf_en_internet": buscar_pdf_en_internet,
    "descargar_pdf": descargar_pdf,
    "descargar_imagenes": descargar_imagenes,
    "descargar_video": descargar_video,
    "abrir_enlace": abrir_enlace,
    "extraer_web": extraer_web,
}
