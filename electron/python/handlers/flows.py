from __future__ import annotations

from typing import Any


def build_flow(flujo: str, params: dict[str, Any]) -> list[dict[str, Any]] | None:
    tema = str(params.get("tema") or "clase").strip()
    grado = str(params.get("grado") or "").strip()
    youtube = params.get("youtube_urls") or params.get("urls") or []
    if isinstance(youtube, str):
        youtube = [youtube]
    url = params.get("url") or (youtube[0] if youtube else "")

    if flujo == "ejecutar_flujo_preparar_clase":
        pasos: list[dict[str, Any]] = [
            {"accion": "crear_carpeta_clase", "params": {"tema": tema, "grado": grado}},
            {"accion": "buscar_informacion", "params": {"tema": tema}},
            {
                "accion": "generar_resumen",
                "params": {"texto": "{{paso1.resumen}}", "tema": tema, "url": "{{paso1.url}}"},
            },
            {"accion": "generar_guia_estudio", "params": {"tema": tema, "resumen": "{{paso2.resumen}}"}},
            {"accion": "crear_ppt", "params": {"tema": tema, "titulo": tema}},
        ]
        if url:
            pasos.insert(
                1,
                {"accion": "descargar_video", "params": {"url": url, "tema": tema}},
            )
            pasos.append(
                {"accion": "optimizar_video", "params": {"max_mb": params.get("max_video_mb", 30)}},
            )
        pasos.append({"accion": "organizar_archivos", "params": {}})
        return pasos

    if flujo == "ejecutar_flujo_examen":
        return [
            {"accion": "crear_carpeta_clase", "params": {"tema": f"examen_{tema}", "grado": grado}},
            {"accion": "generar_examen", "params": {"tema": tema}},
            {"accion": "generar_banco_preguntas", "params": {"tema": tema}},
            {"accion": "crear_tarea", "params": {"tema": tema}},
        ]

    if flujo == "ejecutar_flujo_preparar_material":
        return [
            {"accion": "crear_carpeta_clase", "params": {"tema": tema, "grado": grado}},
            {"accion": "buscar_pdf_en_internet", "params": {"tema": tema}},
            {"accion": "crear_ppt", "params": {"tema": tema}},
            {"accion": "crear_pdf", "params": {"titulo": tema, "contenido": "Material de apoyo"}},
        ]

    if flujo == "ejecutar_flujo_buscar_y_pdf":
        return [
            {"accion": "crear_carpeta_clase", "params": {"tema": tema, "grado": grado}},
            {"accion": "buscar_informacion", "params": {"tema": tema}},
            {
                "accion": "generar_resumen",
                "params": {"texto": "{{paso1.resumen}}", "tema": tema, "url": "{{paso1.url}}"},
            },
            {
                "accion": "crear_pdf",
                "params": {
                    "titulo": f"Resumen {tema}",
                    "contenido": "{{paso2.resumen}}",
                },
            },
        ]

    return None
