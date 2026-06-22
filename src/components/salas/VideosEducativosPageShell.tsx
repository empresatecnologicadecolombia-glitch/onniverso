import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  VIDEOS_EDUCATIVOS_CONTAINER_CLASS,
  VIDEOS_EDUCATIVOS_GRID_CLASS,
  VIDEOS_EDUCATIVOS_MAIN_CLASS,
  VIDEOS_EDUCATIVOS_PAGE_ROOT_CLASS,
  VIDEOS_EDUCATIVOS_SECTION_CLASS,
} from "@/components/salas/videosEducativosLayout";

type VideosEducativosPageShellProps = {
  children: ReactNode;
};

/**
 * Shell congelado de /nuestras-salas (Videos educativos del menú superior).
 * No mover padding ni max-width aquí; extender solo vía videosEducativosLayout.ts.
 */
export default function VideosEducativosPageShell({ children }: VideosEducativosPageShellProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className={VIDEOS_EDUCATIVOS_PAGE_ROOT_CLASS} data-camera-page-root>
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

      <main className={VIDEOS_EDUCATIVOS_MAIN_CLASS}>
        <div className={VIDEOS_EDUCATIVOS_CONTAINER_CLASS}>
          <div className="mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-white/30 hover:bg-slate-900/90 active:scale-95"
              aria-label="Volver atrás"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <section id="podcast" className={VIDEOS_EDUCATIVOS_SECTION_CLASS}>
            <div className={VIDEOS_EDUCATIVOS_GRID_CLASS}>{children}</div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
