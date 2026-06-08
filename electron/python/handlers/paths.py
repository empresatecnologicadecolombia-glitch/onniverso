from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any


def clases_base() -> Path:
    raw = os.environ.get("ONNI_CLASES_BASE", "").strip()
    if raw:
        return Path(raw).expanduser()
    return Path.home() / "Documents" / "OnniVers" / "Clases"


def slugify(text: str) -> str:
    value = text.strip().lower()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"[\s_]+", "_", value)
    return value[:80] or "clase"


def ensure_class_layout(root: Path) -> dict[str, Path]:
    folders = {
        "root": root,
        "originales": root / "01_originales",
        "videos": root / "02_videos",
        "documentos": root / "03_documentos",
        "imagenes": root / "04_imagenes",
        "onni": root / "_onni",
    }
    for folder in folders.values():
        folder.mkdir(parents=True, exist_ok=True)
    return folders


def write_manifest(root: Path, data: dict[str, Any]) -> Path:
    onni = root / "_onni"
    onni.mkdir(parents=True, exist_ok=True)
    manifest = onni / "manifest.json"
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def default_class_folder(tema: str, grado: str = "") -> Path:
    date = datetime.now().strftime("%Y-%m-%d")
    parts = [date]
    if grado.strip():
        parts.append(slugify(grado))
    parts.append(slugify(tema))
    return clases_base() / "_".join(parts)
