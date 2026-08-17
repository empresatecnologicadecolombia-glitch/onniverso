import { describe, expect, it } from "vitest";
import {
  hasNativeLobbyVideoOverlay,
  isNativeAndroidLobby,
  lobbyShouldUseMobileLiteScene,
} from "@/lib/lobbyNativeVideoOverlay";

describe("lobbyNativeVideoOverlay", () => {
  it("detecta overlay solo si existen métodos del APK Capacitor", () => {
    expect(hasNativeLobbyVideoOverlay()).toBe(false);
    expect(isNativeAndroidLobby()).toBe(false);

    (window as Window & { Android?: Record<string, unknown> }).Android = {
      openColiseo: () => undefined,
    };
    expect(isNativeAndroidLobby()).toBe(true);
    expect(hasNativeLobbyVideoOverlay()).toBe(false);

    (window as Window & { Android?: Record<string, unknown> }).Android = {
      loadLobbyPantalla2Player: () => undefined,
    };
    expect(hasNativeLobbyVideoOverlay()).toBe(true);

    delete (window as Window & { Android?: unknown }).Android;
  });

  it("mobile lite depende de coarse pointer / UA", () => {
    expect(typeof lobbyShouldUseMobileLiteScene()).toBe("boolean");
  });
});
