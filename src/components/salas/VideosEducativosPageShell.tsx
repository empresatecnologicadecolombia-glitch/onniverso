import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import {
  VIDEOS_EDUCATIVOS_BACK_BTN_CLASS,
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
            <BackToProfileHomeButton className={VIDEOS_EDUCATIVOS_BACK_BTN_CLASS} />
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
