from __future__ import annotations

import shutil
import zipfile
from pathlib import Path
from typing import Any, Callable

from .paths import clases_base, default_class_folder, ensure_class_layout, slugify, write_manifest


def _ok(accion: str, carpeta: str = "", archivos: list[str] | None = None, mensaje: str = "") -> dict[str, Any]:
    return {
        "ok": True,
        "accion": accion,
        "carpeta": carpeta,
        "archivos": archivos or [],
        "mensaje": mensaje or "Listo",
    }


def crear_carpeta_clase(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or params.get("nombre") or "clase").strip()
    grado = str(params.get("grado") or "").strip()
    root = Path(params["carpeta"]) if params.get("carpeta") else default_class_folder(tema, grado)
    ensure_class_layout(root)
    write_manifest(
        root,
        {
            "tema": tema,
            "grado": grado,
            "estado": "borrador",
            "creado": root.name,
        },
    )
    return _ok("crear_carpeta_clase", str(root), mensaje=f"Carpeta de clase creada: {root.name}")


def leer_carpeta(params: dict[str, Any]) -> dict[str, Any]:
    folder = Path(params.get("carpeta") or params.get("ruta") or clases_base())
    if not folder.exists():
        return {"ok": False, "accion": "leer_carpeta", "mensaje": f"No existe: {folder}"}
    entries = []
    for item in sorted(folder.rglob("*") if params.get("recursivo") else folder.iterdir()):
        if item.is_file():
            entries.append({"nombre": item.name, "ruta": str(item), "bytes": item.stat().st_size})
    return {
        "ok": True,
        "accion": "leer_carpeta",
        "carpeta": str(folder),
        "archivos": [e["ruta"] for e in entries],
        "entradas": entries,
        "mensaje": f"{len(entries)} archivo(s)",
    }


def organizar_archivos(params: dict[str, Any]) -> dict[str, Any]:
    folder = Path(params.get("carpeta") or params.get("carpeta_clase") or clases_base())
    if not folder.exists():
        return {"ok": False, "accion": "organizar_archivos", "mensaje": f"No existe: {folder}"}

    bucket_map = {
        "pdf": "03_documentos",
        "doc": "03_documentos",
        "docx": "03_documentos",
        "xls": "03_documentos",
        "xlsx": "03_documentos",
        "ppt": "03_documentos",
        "pptx": "03_documentos",
        "mp4": "02_videos",
        "webm": "02_videos",
        "mkv": "02_videos",
        "jpg": "04_imagenes",
        "jpeg": "04_imagenes",
        "png": "04_imagenes",
        "gif": "04_imagenes",
        "zip": "01_originales",
    }

    moved = 0
    for item in list(folder.iterdir()):
        if not item.is_file():
            continue
        ext = item.suffix.lower().lstrip(".") or "otros"
        target_dir = folder / bucket_map.get(ext, "01_originales")
        target_dir.mkdir(parents=True, exist_ok=True)
        dest = target_dir / item.name
        if dest.exists():
            dest = target_dir / f"{item.stem}_{moved}{item.suffix}"
        shutil.move(str(item), str(dest))
        moved += 1

    return _ok("organizar_archivos", str(folder), mensaje=f"Organizados {moved} archivo(s)")


def mover_archivo(params: dict[str, Any]) -> dict[str, Any]:
    src = Path(params.get("origen") or params.get("archivo") or "")
    dst = Path(params.get("destino") or params.get("carpeta") or "")
    if not src.exists():
        return {"ok": False, "accion": "mover_archivo", "mensaje": "Origen no existe"}
    if dst.is_dir():
        dst = dst / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return _ok("mover_archivo", str(dst.parent), [str(dst)], "Archivo movido")


def copiar_archivo(params: dict[str, Any]) -> dict[str, Any]:
    src = Path(params.get("origen") or params.get("archivo") or "")
    dst = Path(params.get("destino") or params.get("carpeta") or "")
    if not src.exists():
        return {"ok": False, "accion": "copiar_archivo", "mensaje": "Origen no existe"}
    if dst.is_dir():
        dst = dst / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(str(src), str(dst))
    return _ok("copiar_archivo", str(dst.parent), [str(dst)], "Archivo copiado")


def renombrar_archivo(params: dict[str, Any]) -> dict[str, Any]:
    src = Path(params.get("archivo") or params.get("origen") or "")
    nuevo = str(params.get("nuevo_nombre") or params.get("nombre") or "").strip()
    if not src.exists() or not nuevo:
        return {"ok": False, "accion": "renombrar_archivo", "mensaje": "Archivo o nombre inválido"}
    dest = src.parent / nuevo
    src.rename(dest)
    return _ok("renombrar_archivo", str(dest.parent), [str(dest)], "Renombrado")


def buscar_archivo(params: dict[str, Any]) -> dict[str, Any]:
    folder = Path(params.get("carpeta") or clases_base())
    query = str(params.get("consulta") or params.get("nombre") or "").strip().lower()
    matches = []
    if folder.exists():
        for item in folder.rglob("*"):
            if item.is_file() and (not query or query in item.name.lower()):
                matches.append(str(item))
    return {
        "ok": True,
        "accion": "buscar_archivo",
        "carpeta": str(folder),
        "archivos": matches,
        "mensaje": f"{len(matches)} coincidencia(s)",
    }


def comprimir_archivos(params: dict[str, Any]) -> dict[str, Any]:
    folder = Path(params.get("carpeta") or clases_base())
    zip_path = Path(params.get("salida") or folder / f"{folder.name or 'clase'}.zip")
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        base = folder
        for item in base.rglob("*"):
            if item.is_file():
                zf.write(item, item.relative_to(base))
    return _ok("comprimir_archivos", str(zip_path.parent), [str(zip_path)], "ZIP creado")


def descomprimir_archivos(params: dict[str, Any]) -> dict[str, Any]:
    zip_path = Path(params.get("archivo") or params.get("zip") or "")
    dest = Path(params.get("carpeta") or zip_path.parent)
    if not zip_path.exists():
        return {"ok": False, "accion": "descomprimir_archivos", "mensaje": "ZIP no encontrado"}
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest)
    return _ok("descomprimir_archivos", str(dest), mensaje="ZIP descomprimido")


def eliminar_archivo(params: dict[str, Any]) -> dict[str, Any]:
    if not params.get("confirmar"):
        return {
            "ok": False,
            "accion": "eliminar_archivo",
            "mensaje": "Requiere confirmar: true",
            "requiere_confirmacion": True,
        }
    target = Path(params.get("archivo") or params.get("ruta") or "")
    if not target.exists():
        return {"ok": False, "accion": "eliminar_archivo", "mensaje": "No existe"}
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return _ok("eliminar_archivo", str(target.parent), mensaje="Eliminado")


ACTIONS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "crear_carpeta_clase": crear_carpeta_clase,
    "leer_carpeta": leer_carpeta,
    "organizar_archivos": organizar_archivos,
    "mover_archivo": mover_archivo,
    "copiar_archivo": copiar_archivo,
    "renombrar_archivo": renombrar_archivo,
    "buscar_archivo": buscar_archivo,
    "comprimir_archivos": comprimir_archivos,
    "descomprimir_archivos": descomprimir_archivos,
    "eliminar_archivo": eliminar_archivo,
}
