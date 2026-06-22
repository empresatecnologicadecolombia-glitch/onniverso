import { useEffect } from "react";
import { LogIn } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import HomeOnniVersSeoSection from "@/components/HomeOnniVersSeoSection";
import WorldCupVrHero from "@/components/WorldCupVrHero";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import OnniVersDownloadAppButton from "@/components/OnniVersDownloadAppButton";
import { useAuth } from "@/hooks/useAuth";

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
        <div className="relative z-20 mx-auto max-w-7xl px-6 pt-14 pb-1">
          <div className="relative flex items-center justify-center">
            {user ? (
              <BackToProfileHomeButton iconOnly className="absolute left-0 top-1/2 -translate-y-1/2" />
            ) : null}
            {!user ? (
              <Button
                type="button"
                variant="hero"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 shrink-0 gap-1.5"
                onClick={() => navigate("/entrar")}
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Entrar
              </Button>
            ) : null}
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
