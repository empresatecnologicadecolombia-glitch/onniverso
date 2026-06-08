import { describe, expect, it } from "vitest";
import { matchOnniDesktopIntent } from "@/lib/onniDesktop/intents";

describe("matchOnniDesktopIntent", () => {
  it("detecta preparame una clase sobre biologia", () => {
    const job = matchOnniDesktopIntent("Prepárame una clase sobre biología");
    expect(job?.tipo).toBe("flujo");
    expect(job && "flujo" in job && job.flujo).toBe("ejecutar_flujo_preparar_clase");
    expect(job && "params" in job && job.params?.tema).toMatch(/biolog/i);
  });

  it("detecta carpeta con videos pdf y resumen", () => {
    const job = matchOnniDesktopIntent(
      "Créame una carpeta que tenga videos, PDF y resumen sobre qué son las células",
    );
    expect(job?.tipo).toBe("flujo");
    expect(String(job && "params" in job ? job.params?.tema : "")).toMatch(/c[eé]lul/i);
  });
});
