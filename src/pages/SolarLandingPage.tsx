/**
 * Página pública de energía solar (paneles, bombas, baterías e inversores).
 * El HTML vive en public/ventas-cam.
 */
const SolarLandingPage = () => {
  return (
    <main className="min-h-screen bg-slate-950">
      <iframe
        title="Empresa Tecnológica de Colombia — paneles, bombas e instalaciones solares"
        src="/ventas-cam/energia-solar.html"
        className="block h-[100dvh] w-full border-0"
      />
    </main>
  );
};

export default SolarLandingPage;
