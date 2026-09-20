/**
 * Página pública de cámaras con energía solar. El HTML vive en public/ventas-cam.
 */
const SolarCamerasLandingPage = () => {
  return (
    <main className="min-h-screen bg-slate-950">
      <iframe
        title="Empresa Tecnológica de Colombia — cámaras con energía solar"
        src="/ventas-cam/camaras-solares.html"
        className="block h-[100dvh] w-full border-0"
      />
    </main>
  );
};

export default SolarCamerasLandingPage;
