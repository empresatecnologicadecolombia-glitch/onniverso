import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNativeAndroid } from "@/lib/nativePlayback";
import { isAndroidNativeApp, isElectronDesktopApp } from "@/lib/deviceDetection";

/**
 * Página pública principal para Empresa Tecnológica de Colombia.
 *
 * La página completa vive en public/ventas-cam para conservar el HTML/CSS/JS
 * original. Se muestra dentro de la portada para mantener visible la URL "/".
 * Las apps existentes entran por la misma raíz, por eso se envían
 * automáticamente a Educación sin modificar sus APK ni el .exe.
 */
const CamerasLandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAndroidNativeApp() || isNativeAndroid() || isElectronDesktopApp()) {
      navigate("/educacion", { replace: true });
      return;
    }

  }, [navigate]);

  return (
    <main className="min-h-screen bg-slate-950">
      <iframe
        title="Empresa Tecnológica de Colombia — cámaras, redes y seguridad"
        src="/ventas-cam/index.html"
        className="block h-[100dvh] w-full border-0"
      />
    </main>
  );
};

export default CamerasLandingPage;
