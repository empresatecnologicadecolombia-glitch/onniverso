#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OnniVers — oficina docente local (stdin JSON → stdout JSON)."""
from __future__ import annotations

import json
import sys

from handlers import dispatch


def main() -> None:
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"ok": False, "mensaje": "Sin entrada JSON"}, ensure_ascii=False))
        return
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "mensaje": f"JSON inválido: {exc}"}, ensure_ascii=False))
        return

    try:
        result = dispatch(payload)
    except Exception as exc:  # noqa: BLE001 — CLI boundary
        result = {"ok": False, "mensaje": str(exc)}

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
