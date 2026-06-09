import { resolveColiseoLaunchUrl } from "@/lib/coliseoClassVoiceBaseline";

/** Baseline congelado: `.cursor/rules/coliseo-class-voice-frozen.mdc` */
export { resolveColiseoLaunchUrl };

/** Hay puente nativo Coliseo (APK). */
export function hasColiceoNativeBridge(): boolean {
  return (
    typeof window.Android?.openColiseoVR === "function" ||
    typeof window.Android?.openColiseoDirect === "function" ||
    typeof window.Android?.openSelector === "function" ||
    typeof window.Android?.openColiceo === "function" ||
    typeof window.AndroidBridge?.openColiceoDirect === "function" ||
    typeof window.AndroidBridge?.openColiceo === "function"
  );
}

/** Abre {@link ColiceoActivity} en Android (Coliseo 360 / clase con pantalla nativa). */
export function invokeOpenColiceoDirect(classPageUrl?: string): boolean {
  const launchUrl = resolveColiseoLaunchUrl(classPageUrl);

  if (launchUrl) {
    if (typeof window.AndroidBridge?.openColiseoDirect === "function") {
      window.AndroidBridge.openColiseoDirect(launchUrl, "class");
      return true;
    }
    if (typeof window.Android?.openColiseoDirect === "function") {
      window.Android.openColiseoDirect(launchUrl, "class");
      return true;
    }
  }

  if (typeof window.Android?.openColiseoVR === "function") {
    window.Android.openColiseoVR();
    return true;
  }
  if (typeof window.Android?.openSelector === "function") {
    window.Android.openSelector();
    return true;
  }
  if (typeof window.Android?.openColiceo === "function") {
    window.Android.openColiceo();
    return true;
  }
  if (typeof window.AndroidBridge?.openColiceo === "function") {
    window.AndroidBridge.openColiceo();
    return true;
  }
  return false;
}
