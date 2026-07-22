import { useEffect } from "react";
import { LogIn, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import HomeOnniVersSeoSection from "@/components/HomeOnniVersSeoSection";
import WorldCupVrHero from "@/components/WorldCupVrHero";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import OnniVersDownloadAppButton from "@/components/OnniVersDownloadAppButton";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    OniPinWidget?: { open: () => void; close: () => void; toggle: () => void };
    openOnniPinChat?: () => void;
  }
}

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const scrollTo = (location.state as any)?.scrollTo;
    if (scrollTo) {
      setTimeout(() => {
        document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background" data-camera-page-root>
      <section id="perfil" className="relative z-20">
        <Navbar />
        <div className="relative z-20 mx-auto max-w-7xl px-4 pt-14 pb-1 sm:px-6">
          <div
            className={
              user
                ? "relative flex items-center justify-center px-11 sm:px-0"
                : "relative flex items-center justify-center"
            }
          >
            {user ? (
              <BackToProfileHomeButton iconOnly className="absolute left-0 top-1/2 -translate-y-1/2" />
            ) : null}
            <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 flex-col items-end gap-1.5">
              {!user ? (
                <Button
                  type="button"
                  variant="hero"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => navigate("/entrar")}
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  Entrar
                </Button>
              ) : null}
              <Button
                type="button"
                variant="hero"
                size="sm"
                className="shrink-0 gap-1.5 border border-cyan-400/35 bg-cyan-500/15 text-cyan-50 hover:bg-cyan-500/25"
                aria-label="Contáctanos — chateemos"
                onClick={() => {
                  window.OniPinWidget?.open();
                }}
              >
                <span
                  aria-hidden
                  className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-400/40 to-violet-500/35 shadow-[0_0_10px_hsl(175_80%_50%/0.35)]"
                >
                  <MessageCircle className="h-3 w-3 text-cyan-50" strokeWidth={2.4} />
                </span>
                Contáctanos
              </Button>
            </div>
            <OnniVersDownloadAppButton onClick={() => navigate("/descargar")} />
          </div>
        </div>
        <WorldCupVrHero />
        <HomeOnniVersSeoSection />
        <Footer />
      </section>
    </div>
  );
};

export default Index;
