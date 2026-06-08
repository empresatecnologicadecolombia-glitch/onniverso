from __future__ import annotations

from typing import Any

from . import documents, education, files, flows, internet, media


ELECTRON_ACTIONS = {
    "abrir_carpeta",
    "abrir_archivo",
    "mostrar_notificacion",
    "abrir_ventana_preview",
    "abrir_clase_web",
    "reproducir_video",
}


def run_action(accion: str, params: dict[str, Any]) -> dict[str, Any]:
    if accion in ELECTRON_ACTIONS:
        return {
            "ok": False,
            "accion": accion,
            "mensaje": f"La acción {accion} la ejecuta Electron, no Python.",
            "delegar_electron": True,
        }

    table = {
        **files.ACTIONS,
        **documents.ACTIONS,
        **internet.ACTIONS,
        **media.ACTIONS,
        **education.ACTIONS,
    }

    handler = table.get(accion)
    if not handler:
        return {"ok": False, "accion": accion, "mensaje": f"Acción desconocida: {accion}"}
    return handler(params or {})


def _lookup_context(context: dict[str, Any], key: str) -> Any:
    if key in context:
        return context[key]
    if "." in key:
        head, tail = key.split(".", 1)
        node = context.get(head)
        if isinstance(node, dict):
            return _lookup_context(node, tail)
    return None


def resolve_templates(value: Any, context: dict[str, Any]) -> Any:
    if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
        key = value[2:-2].strip()
        resolved = _lookup_context(context, key)
        return value if resolved is None else resolved
    if isinstance(value, dict):
        return {k: resolve_templates(v, context) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve_templates(v, context) for v in value]
    return value


def run_sequence(pasos: list[dict[str, Any]]) -> dict[str, Any]:
    context: dict[str, Any] = {}
    archivos: list[str] = []
    carpeta = ""

    for index, paso in enumerate(pasos):
        accion = paso.get("accion", "")
        params = resolve_templates(paso.get("params") or {}, context)
        if carpeta and isinstance(params, dict) and "carpeta_clase" not in params:
            if accion not in ("crear_carpeta_clase", "abrir_carpeta", "leer_carpeta"):
                params["carpeta_clase"] = carpeta
        result = run_action(accion, params)
        if result.get("delegar_electron"):
            return {
                "ok": False,
                "mensaje": f"El paso {index + 1} ({accion}) requiere Electron en el cliente.",
            }
        if not result.get("ok"):
            return {
                "ok": False,
                "mensaje": result.get("mensaje", f"Falló paso {index + 1}: {accion}"),
                "paso": index + 1,
                "accion": accion,
            }
        context[f"paso{index}"] = result
        context.update({k: v for k, v in result.items() if k not in ("ok",)})
        if result.get("carpeta"):
            carpeta = result["carpeta"]
        archivos.extend(result.get("archivos") or [])

    return {
        "ok": True,
        "tipo": "secuencia",
        "carpeta": carpeta,
        "archivos": archivos,
        "mensaje": "Secuencia completada",
    }


def dispatch(payload: dict[str, Any]) -> dict[str, Any]:
    tipo = payload.get("tipo", "accion")

    if tipo == "flujo" or payload.get("flujo"):
        flujo = payload.get("flujo", "")
        params = payload.get("params") or {}
        pasos = flows.build_flow(flujo, params)
        if not pasos:
            return {"ok": False, "mensaje": f"Flujo desconocido: {flujo}"}
        return run_sequence(pasos)

    if tipo == "secuencia" or isinstance(payload.get("pasos"), list):
        return run_sequence(payload.get("pasos") or [])

    accion = payload.get("accion", "")
    params = payload.get("params") or {}
    if not accion and isinstance(params, dict) and params.get("tema"):
        accion = "crear_carpeta_clase"
    return run_action(accion, params)
