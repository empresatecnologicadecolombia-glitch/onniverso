import { describe, expect, it, vi } from "vitest";
import {
  COLISEO_CLASS_ENTRY_FLOW,
  COLISEO_CLASS_VOICE_BASELINE_VERSION,
  buildClassVoiceAgoraChannel,
  buildClassVoicePresenceChannel,
  classUrlHasClassParam,
  resolveColiseoLaunchUrl,
} from "@/lib/coliseoClassVoiceBaseline";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";

/** Candado regresión — clase Coliseo + voz Agora + presencia + APK (jun 2026). */
describe("coliseoClassVoiceBaseline", () => {
  it("mantiene version del baseline validado", () => {
    expect(COLISEO_CLASS_VOICE_BASELINE_VERSION).toBe("2026-06-validated");
  });

  it("entrada de clase: APK nativo primero con fallback web", () => {
    expect(COLISEO_CLASS_ENTRY_FLOW.nativeFirst).toBe(true);
    expect(COLISEO_CLASS_ENTRY_FLOW.stashBeforeOpen).toBe(true);
    expect(COLISEO_CLASS_ENTRY_FLOW.allowNativeForClassSessions).toBe(true);
    expect(COLISEO_CLASS_ENTRY_FLOW.fallbackWebNavigate).toBe(true);
  });

  it("canales Agora/presencia estables por slug", () => {
    expect(buildClassVoiceAgoraChannel("Mi-Clase")).toBe("al-universo-class-voice-mi-clase");
    expect(buildClassVoicePresenceChannel("Mi-Clase")).toBe(
      "class-voice-presence-al-universo-class-voice-mi-clase",
    );
  });

  it("URL de clase conserva param class", () => {
    const url = "/coliseo?class=algebra&session=abc";
    expect(classUrlHasClassParam(url)).toBe(true);
    expect(resolveColiseoLaunchUrl(url)).toMatch(/\/coliseo\?class=algebra/);
  });

  it("invokeOpenColiceoDirect pasa URL completa con class a AndroidBridge", () => {
    const openColiseoDirect = vi.fn();
    vi.stubGlobal("window", {
      location: { origin: "https://onnivers.com" },
      AndroidBridge: { openColiseoDirect },
    });

    const classUrl = "/coliseo?class=algebra&video=https%3A%2F%2Fexample.com%2Fa.mp4";
    const opened = invokeOpenColiceoDirect(classUrl);

    expect(opened).toBe(true);
    expect(openColiseoDirect).toHaveBeenCalledWith(
      "https://onnivers.com/coliseo?class=algebra&video=https%3A%2F%2Fexample.com%2Fa.mp4",
      "class",
    );

    vi.unstubAllGlobals();
  });
});
