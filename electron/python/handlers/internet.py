from __future__ import annotations

import json
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


def _wiki_summary_for_title(title: str) -> tuple[str, str]:
    slug = urllib.parse.quote(title.replace(" ", "_"), safe="/")
    url = f"https://es.wikipedia.org/api/rest_v1/page/summary/{slug}"
    data = json.loads(_fetch_url(url).decode("utf-8"))
    resumen = str(data.get("extract") or data.get("description") or "").strip()
    page_url = str(data.get("content_urls", {}).get("desktop", {}).get("page") or "").strip()
    return resumen, page_url


_WIKI_STOP_WORDS = frozenset(
    {"las", "los", "la", "el", "un", "una", "de", "del", "en", "y", "que", "sobre", "the", "a", "un", "una"}
)


def _significant_words(tema: str) -> set[str]:
    return {w for w in re.findall(r"\w{3,}", tema.lower()) if w not in _WIKI_STOP_WORDS}


def _wiki_search_titles(tema: str, limit: int = 5) -> list[str]:
    sig = " ".join(sorted(_significant_words(tema)))
    queries = [tema]
    if sig and sig.lower() != tema.lower():
        queries.append(sig)

    titles: list[str] = []
    seen: set[str] = set()
    tema_words = _significant_words(tema)

    for query in queries:
        encoded = urllib.parse.quote(query)
        url = (
            "https://es.wikipedia.org/w/api.php"
            f"?action=opensearch&search={encoded}&limit={limit}&namespace=0&format=json"
        )
        data = json.loads(_fetch_url(url).decode("utf-8"))
        if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
            for title in data[1]:
                t = str(title).strip()
                if t and t not in seen:
                    seen.add(t)
                    titles.append(t)

    if tema_words:
        titles.sort(
            key=lambda title: len(tema_words & set(re.findall(r"\w{3,}", title.lower()))),
            reverse=True,
        )
    return titles


def _duckduckgo_abstract(tema: str) -> tuple[str, str]:
    query = urllib.parse.quote(tema)
    url = f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1"
    data = json.loads(_fetch_url(url).decode("utf-8"))
    resumen = str(data.get("AbstractText") or "").strip()
    source_url = str(data.get("AbstractURL") or "").strip()
    return resumen, source_url


def buscar_informacion(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or params.get("consulta") or "").strip()
    if not tema:
        return {"ok": False, "accion": "buscar_informacion", "mensaje": "Falta tema"}

    query = urllib.parse.quote(tema)
    google_url = f"https://www.google.com/search?q={query}"
    resumen = ""
    page_url = ""
    fuente = ""

    try:
        resumen, page_url = _wiki_summary_for_title(tema)
        if resumen:
            fuente = "Wikipedia"
    except Exception:
        pass

    if not resumen:
        for title in _wiki_search_titles(tema):
            try:
                resumen, page_url = _wiki_summary_for_title(title)
                if resumen:
                    fuente = f"Wikipedia ({title})"
                    break
            except Exception:
                continue

    if not resumen:
        try:
            resumen, page_url = _duckduckgo_abstract(tema)
            if resumen:
                fuente = "DuckDuckGo"
        except Exception:
            pass

    if not resumen:
        resumen = (
            f"Material de apoyo sobre «{tema}».\n\n"
            "No se encontró un resumen automático en línea. "
            "Puedes ampliar este documento con tus apuntes o fuentes del enlace de búsqueda."
        )
        page_url = google_url
        fuente = "búsqueda web"

    return {
        "ok": True,
        "accion": "buscar_informacion",
        "tema": tema,
        "resumen": resumen,
        "url": page_url or google_url,
        "fuente": fuente,
        "mensaje": f"Información encontrada ({fuente})" if fuente else "Información preparada",
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
