from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any, Callable


def _ffmpeg() -> str:
    return shutil.which("ffmpeg") or "ffmpeg"


def optimizar_video(params: dict[str, Any]) -> dict[str, Any]:
    src = Path(params.get("archivo") or params.get("origen") or "")
    if not src.exists():
        candidates = list(Path(params.get("carpeta_clase") or ".").rglob("*.mp4"))
        src = Path(candidates[0]) if candidates else src
    if not src.exists():
        return {"ok": False, "accion": "optimizar_video", "mensaje": "Video no encontrado"}

    max_mb = float(params.get("max_mb") or params.get("max_video_mb") or 30)
    root = src.parent.parent if src.parent.name == "01_originales" else src.parent
    out_dir = root / "02_videos"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "video_01.mp4"

    bitrates = ["1200k", "800k", "500k", "300k"]
    for br in bitrates:
        cmd = [
            _ffmpeg(),
            "-y",
            "-i",
            str(src),
            "-c:v",
            "libx264",
            "-b:v",
            br,
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            "-movflags",
            "+faststart",
            str(out),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            return {"ok": False, "accion": "optimizar_video", "mensaje": proc.stderr or "ffmpeg falló"}
        if out.stat().st_size <= max_mb * 1024 * 1024:
            break

    size_mb = out.stat().st_size / (1024 * 1024)
    return {
        "ok": True,
        "accion": "optimizar_video",
        "carpeta": str(root),
        "archivos": [str(out)],
        "mb": round(size_mb, 2),
        "mensaje": f"Video optimizado ({size_mb:.1f} MB)",
    }


def cortar_video(params: dict[str, Any]) -> dict[str, Any]:
    src = Path(params.get("archivo") or params.get("origen") or "")
    inicio = str(params.get("inicio") or "00:00:00")
    duracion = str(params.get("duracion") or "00:05:00")
    out = Path(params.get("salida") or src.with_name(f"{src.stem}_corte{src.suffix}"))
    cmd = [_ffmpeg(), "-y", "-ss", inicio, "-i", str(src), "-t", duracion, "-c", "copy", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return {"ok": False, "accion": "cortar_video", "mensaje": proc.stderr or "ffmpeg falló"}
    return {"ok": True, "accion": "cortar_video", "archivos": [str(out)], "mensaje": "Video cortado"}


def unir_video(params: dict[str, Any]) -> dict[str, Any]:
    archivos = [Path(p) for p in (params.get("archivos") or [])]
    if len(archivos) < 2:
        return {"ok": False, "accion": "unir_video", "mensaje": "Se necesitan al menos 2 archivos"}
    lista = Path(params.get("carpeta") or archivos[0].parent) / "_concat_list.txt"
    lista.write_text("\n".join(f"file '{a}'" for a in archivos), encoding="utf-8")
    out = Path(params.get("salida") or archivos[0].parent / "video_unido.mp4")
    cmd = [_ffmpeg(), "-y", "-f", "concat", "-safe", "0", "-i", str(lista), "-c", "copy", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    lista.unlink(missing_ok=True)
    if proc.returncode != 0:
        return {"ok": False, "accion": "unir_video", "mensaje": proc.stderr or "ffmpeg falló"}
    return {"ok": True, "accion": "unir_video", "archivos": [str(out)], "mensaje": "Videos unidos"}


def extraer_audio(params: dict[str, Any]) -> dict[str, Any]:
    src = Path(params.get("archivo") or params.get("origen") or "")
    out = Path(params.get("salida") or src.with_suffix(".mp3"))
    cmd = [_ffmpeg(), "-y", "-i", str(src), "-vn", "-acodec", "libmp3lame", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return {"ok": False, "accion": "extraer_audio", "mensaje": proc.stderr or "ffmpeg falló"}
    return {"ok": True, "accion": "extraer_audio", "archivos": [str(out)], "mensaje": "Audio extraído"}


ACTIONS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "optimizar_video": optimizar_video,
    "cortar_video": cortar_video,
    "unir_video": unir_video,
    "extraer_audio": extraer_audio,
}
