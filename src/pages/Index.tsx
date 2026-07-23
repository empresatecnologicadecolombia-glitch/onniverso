import { lazy, Suspense, useEffect } from "react";
import { LogIn, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import OnniVersDownloadAppButton from "@/components/OnniVersDownloadAppButton";
import { useAuth } from "@/hooks/useAuth";
import { ensureOnniPinWidget, openOnniPinChat } from "@/lib/onniPinWidget";

const WorldCupVrHero = lazy(() => import("@/components/WorldCupVrHero"));
const HomeOnniVersSeoSection = lazy(() => import("@/components/HomeOnniVersSeoSection"));
const Footer = lazy(() => import("@/components/Footer"));

function HomeHeroFallback() {
  return (
    <section
      className="relative flex min-h-[70dvh] items-center justify-center overflow-hidden px-6 pt-8 pb-16"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,hsl(190_70%_48%/.14),transparent_42%),radial-gradient(circle_at_85%_22%,hsl(270_55%_52%/.12),transparent_38%),hsl(230_45%_8%)]" />
      <div className="relative z-10 text-center">
        <p className="bg-gradient-to-br from-cyan-50 via-white to-slate-200 bg-clip-text font-headline text-[clamp(1.85rem,6.5vw,3.25rem)] font-semibold tracking-[0.18em] text-transparent">
          ONNIVERS
        </p>
        <p className="mx-auto mt-3 max-w-3xl font-headline text-[clamp(0.82rem,2.8vw,1.15rem)] font-semibold tracking-[0.04em] text-cyan-50/95">
          Educación con realidad virtual inmersiva contenido interactivo y experiencias digitales en una sola
          plataforma
        </p>
      </div>
    </section>
  );
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

  useEffect(() => {
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const preload = () => {
      void ensureOnniPinWidget().catch(() => {
        /* Contáctanos reintentará al clic */
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(preload, { timeout: 4000 });
    } else {
      timeoutId = setTimeout(preload, 2500);
    }

    return () => {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

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
                  openOnniPinChat();
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
        <Suspense fallback={<HomeHeroFallback />}>
          <WorldCupVrHero />
        </Suspense>
        <Suspense fallback={null}>
          <HomeOnniVersSeoSection />
          <Footer />
        </Suspense>
      </section>
    </div>
  );
};

export default Index;
