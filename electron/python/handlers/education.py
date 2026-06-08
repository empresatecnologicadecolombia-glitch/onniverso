from __future__ import annotations

from typing import Any, Callable

from . import documents


def generar_guia_estudio(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or "Clase")
    resumen = str(params.get("resumen") or params.get("texto") or "")
    contenido = f"Guía de estudio: {tema}\n\nObjetivos:\n- Comprender {tema}\n- Aplicar conceptos clave\n\n{resumen}"
    return documents.crear_pdf({**params, "titulo": f"Guía {tema}", "contenido": contenido})


def generar_resumen(params: dict[str, Any]) -> dict[str, Any]:
    texto = str(params.get("texto") or params.get("resumen") or "")
    if not texto and params.get("archivo"):
        leido = documents.leer_pdf({"archivo": params["archivo"]})
        if leido.get("ok"):
            texto = leido.get("texto") or ""
    if not texto:
        return {"ok": False, "accion": "generar_resumen", "mensaje": "Sin texto para resumir"}
    lineas = [l.strip() for l in texto.splitlines() if l.strip()]
    resumen = "\n".join(lineas[:12])
    if len(lineas) > 12:
        resumen += f"\n\n... ({len(lineas)} líneas en total)"
    return {
        "ok": True,
        "accion": "generar_resumen",
        "resumen": resumen,
        "texto": resumen,
        "mensaje": "Resumen generado",
    }


def generar_examen(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or "Evaluación")
    filas = [
        ["#", "Pregunta", "Tipo", "Respuesta docente"],
        ["1", f"¿Qué es {tema}?", "Abierta", ""],
        ["2", f"Menciona dos ideas clave de {tema}", "Abierta", ""],
        ["3", f"Aplica {tema} a un ejemplo real", "Abierta", ""],
    ]
    return documents.crear_excel({**params, "titulo": f"Examen {tema}", "filas": filas})


def generar_banco_preguntas(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or "Tema")
    filas = [["Pregunta", "Dificultad"]]
    for i in range(1, 11):
        filas.append([f"Pregunta {i} sobre {tema}", "Media"])
    return documents.crear_excel({**params, "titulo": f"Banco {tema}", "filas": filas})


def crear_tarea(params: dict[str, Any]) -> dict[str, Any]:
    tema = str(params.get("tema") or "Tarea")
    contenido = f"Tarea: {tema}\n\n1. Leer el material de clase.\n2. Responder en una página.\n3. Entregar en la próxima sesión."
    return documents.crear_word({**params, "titulo": f"Tarea {tema}", "contenido": contenido})


ACTIONS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "generar_guia_estudio": generar_guia_estudio,
    "generar_resumen": generar_resumen,
    "generar_examen": generar_examen,
    "generar_banco_preguntas": generar_banco_preguntas,
    "crear_tarea": crear_tarea,
}
