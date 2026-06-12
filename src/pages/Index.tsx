import { useEffect } from "react";
import { LogIn } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import HomeOnniVersSeoSection from "@/components/HomeOnniVersSeoSection";
import WorldCupVrHero from "@/components/WorldCupVrHero";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
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
        <div className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 pt-20 pb-2">
          {user ? <BackToProfileHomeButton /> : <span className="shrink-0" aria-hidden />}
          {!user ? (
            <Button
              type="button"
              variant="hero"
              size="sm"
              className="ml-auto shrink-0 gap-1.5"
              onClick={() => navigate("/entrar")}
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Entrar
            </Button>
          ) : null}
        </div>
        <WorldCupVrHero />
        <HomeOnniVersSeoSection />
        <Footer />
      </section>
    </div>
  );
};

export default Index;
