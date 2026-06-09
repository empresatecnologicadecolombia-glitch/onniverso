import { useEffect, useState } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EducationSection, { type EducationCategoryId } from "@/components/EducationSection";
import { Button } from "@/components/ui/button";
import abecedarioPreviewImg from "@/assets/aula-preview/abecedario.png";
import { useAulaVirtualCardChoice } from "@/hooks/useAulaVirtualCardChoice";
import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { AULA_VIRTUAL_LOBBY_PATH, EDUCACION_LOBBY_CARD_HASH } from "@/lib/aulaVirtual";

const EducacionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<EducationCategoryId | null>(null);
  const { requestAulaVirtualEntry, dialog: aulaCardDialog } = useAulaVirtualCardChoice();
  const onAndroid = isAndroidLiveStreamChoicePlatform();

  const handleBack = () => {
    if (activeCategory) {
      setActiveCategory(null);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    setActiveCategory(null);
  }, [location.pathname]);

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-background"
      data-camera-page-root
    >
      {aulaCardDialog}
      <Navbar />

      <div className="pointer-events-none fixed inset-0" data-camera-decorative-bg>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_85%_95%,hsl(290_80%_60%/0.16),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative z-20 box-border w-full max-w-full px-4 pt-16 pb-20 sm:px-6">
        <div className="mx-auto box-border w-full max-w-6xl">
          <section id="educacion-contenido" className="scroll-mt-24">
            <div className="mb-10 overflow-hidden rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm">
              <div className="border-b border-primary/10 px-4 py-3 sm:px-6">
                <Button
                  type="button"
                  variant="heroOutline"
                  className="mx-auto w-full max-w-xs gap-2 sm:mx-0 sm:w-auto"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Volver atrás
                </Button>
              </div>
              <EducationSection
                activeCategory={activeCategory}
                onActiveCategoryChange={setActiveCategory}
              />
            </div>

            <article
              id={EDUCACION_LOBBY_CARD_HASH}
              className="mt-10 scroll-mt-28 overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-card/50 to-cyan-500/10 p-5 backdrop-blur-xl sm:p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="relative h-44 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-48 lg:w-72">
                  <img
                    src={abecedarioPreviewImg}
                    alt="Lobby educativo inmersivo OnniVers"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
                </div>
                <div className="flex-1">
                  <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                    <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                    Nuevo espacio inmersivo
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Lobby Aula 3D
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Espacio 3D caminable para explorar y jugar. La clase en vivo con docente y alumnos
                    se gestiona desde Aula Virtual → Clase Virtual 360.
                  </p>
                  {onAndroid ? (
                    <Button
                      type="button"
                      variant="heroOutline"
                      size="sm"
                      className="mt-4 touch-manipulation"
                      onClick={() => requestAulaVirtualEntry()}
                    >
                      Entrar al Lobby Aula 3D
                    </Button>
                  ) : (
                    <Button asChild variant="heroOutline" size="sm" className="mt-4 touch-manipulation">
                      <Link to={AULA_VIRTUAL_LOBBY_PATH}>Entrar al Lobby Aula 3D</Link>
                    </Button>
                  )}
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EducacionPage;
