import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DescargarAppsPageContent from "@/components/descargar/DescargarAppsPageContent";
import OnniVersOnlineButton from "@/components/OnniVersOnlineButton";
import { ArrowLeft } from "lucide-react";

const DescargarAppsPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background" data-camera-page-root>
      <Navbar />
      <div
        className="relative overflow-hidden pt-14 pb-8"
        data-camera-decorative-bg
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(190_70%_48%/.12),transparent_50%),radial-gradient(circle_at_80%_20%,hsl(270_55%_52%/.1),transparent_40%),linear-gradient(to_bottom,hsl(235_40%_6%),hsl(235_45%_4%))]" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative flex min-h-10 items-center justify-center">
            <button
              type="button"
              onClick={handleBack}
              className="absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white backdrop-blur-md transition hover:border-white/30 hover:bg-slate-900/90 active:scale-95"
              aria-label="Volver atrás"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="-mt-5 mb-5 flex justify-center">
            <OnniVersOnlineButton />
          </div>
          <DescargarAppsPageContent />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DescargarAppsPage;
