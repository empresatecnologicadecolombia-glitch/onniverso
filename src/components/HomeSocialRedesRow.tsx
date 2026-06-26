import { useCallback, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, GraduationCap, Radio, Sparkles } from "lucide-react";
import HomeSocialCinePickerDialog from "@/components/HomeSocialCinePickerDialog";
import {
  openHomeSocialRedes,
  openHomeSocialRedesCam,
  openYouTubeRedesCine,
  shouldShowHomeSocialCinePicker,
} from "@/lib/homeSocialRedesOpen";
import {
  getHomeInternalShortcutPath,
  getHomeSocialUrl,
  isHomeInternalShortcut,
  loadHomeSocialRedesConfig,
  type HomeSocialIconConfig,
  type HomeSocialIconId,
} from "@/lib/homeSocialRedesConfig";
import { cn } from "@/lib/utils";

const OnniVersGlyph = () => {
  const gradId = `onni-social-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.4" />
      <ellipse cx="24" cy="24" rx="21" ry="10" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.5" opacity="0.75" />
      <circle cx="24" cy="24" r="7" fill="rgba(34,211,238,0.22)" stroke={`url(#${gradId})`} strokeWidth="1.4" />
    </svg>
  );
};

const YouTubeGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.6V8.4L16 12l-6.3 3.6z"
    />
  </svg>
);

const GoogleGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/** Caracol TV (señal en vivo). */
const PlutoTvGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="#141414" />
    <circle cx="8.2" cy="8.2" r="3.1" fill="#F9E000" />
    <circle cx="15.8" cy="8.2" r="3.1" fill="#FF4ABF" />
    <circle cx="8.2" cy="15.8" r="3.1" fill="#00E5FF" />
    <circle cx="15.8" cy="15.8" r="3.1" fill="#9B4DFF" />
    <path d="M11 9.2v5.6l4.6-2.8z" fill="#fff" opacity="0.98" />
  </svg>
);

const OnniversoNavGlyph = () => <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />;

const EducacionGlyph = () => <GraduationCap className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />;

const ClaseVirtualGlyph = () => <Box className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />;

const VideosEducativosGlyph = () => <Radio className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />;

const ICON_BUTTONS: {
  id: HomeSocialIconId;
  label: string;
  className: string;
  Glyph: () => JSX.Element;
}[] = [
  {
    id: "onnivers",
    label: "Panel docente",
    className:
      "border-cyan-400/70 bg-slate-950 text-cyan-100 shadow-[0_0_20px_-6px_rgba(34,211,238,0.9)]",
    Glyph: OnniVersGlyph,
  },
  {
    id: "youtube",
    label: "YouTube",
    className:
      "border-red-500/65 bg-[#ff0000] text-white shadow-[0_0_20px_-6px_rgba(255,0,0,0.95)]",
    Glyph: YouTubeGlyph,
  },
  {
    id: "educacion",
    label: "Educación",
    className:
      "border-violet-400/65 bg-violet-950 text-violet-100 shadow-[0_0_20px_-6px_rgba(139,92,246,0.9)]",
    Glyph: EducacionGlyph,
  },
  {
    id: "clase-virtual",
    label: "Clase Virtual",
    className:
      "border-cyan-400/65 bg-cyan-950 text-cyan-100 shadow-[0_0_20px_-6px_rgba(34,211,238,0.85)]",
    Glyph: ClaseVirtualGlyph,
  },
  {
    id: "videos-educativos",
    label: "Videos educativos",
    className:
      "border-amber-400/65 bg-amber-950 text-amber-100 shadow-[0_0_20px_-6px_rgba(251,191,36,0.85)]",
    Glyph: VideosEducativosGlyph,
  },
  {
    id: "google",
    label: "Google",
    className: "border-white/50 bg-white text-white shadow-[0_0_20px_-6px_rgba(255,255,255,0.75)]",
    Glyph: GoogleGlyph,
  },
  {
    id: "mercadolibre",
    label: "Caracol TV",
    className:
      "border-[#F9E000]/80 bg-[#141414] text-white shadow-[0_0_20px_-6px_rgba(155,77,255,0.95)]",
    Glyph: PlutoTvGlyph,
  },
  {
    id: "onniverso",
    label: "OnniVerso",
    className:
      "border-fuchsia-400/65 bg-gradient-to-br from-violet-950 to-fuchsia-950 text-fuchsia-100 shadow-[0_0_20px_-6px_rgba(217,70,239,0.85)]",
    Glyph: OnniversoNavGlyph,
  },
];

export default function HomeSocialRedesRow() {
  const navigate = useNavigate();
  const [icons] = useState(loadHomeSocialRedesConfig);
  const [picked, setPicked] = useState<HomeSocialIconConfig | null>(null);
  const showCinePicker = useMemo(() => shouldShowHomeSocialCinePicker(), []);

  const onPickCine = useCallback(() => {
    if (!picked || isHomeInternalShortcut(picked.id)) return;
    const url = getHomeSocialUrl(icons, picked.id, "redes");
    if (picked.id === "youtube") {
      openYouTubeRedesCine(url);
    } else {
      openHomeSocialRedes(url);
    }
    setPicked(null);
  }, [icons, picked]);

  const onPickRedesCam = useCallback(() => {
    if (!picked || isHomeInternalShortcut(picked.id)) return;
    openHomeSocialRedesCam(getHomeSocialUrl(icons, picked.id, "redesCam"));
    setPicked(null);
  }, [icons, picked]);

  const handleIconClick = useCallback(
    (id: HomeSocialIconId) => {
      const internalPath = getHomeInternalShortcutPath(id);
      if (internalPath) {
        navigate(internalPath);
        return;
      }

      const icon = icons.find((i) => i.id === id);
      if (!icon) return;
      if (showCinePicker) {
        setPicked(icon);
        return;
      }
      openHomeSocialRedes(getHomeSocialUrl(icons, id, "redes"));
    },
    [icons, navigate, showCinePicker],
  );

  return (
    <>
      <div className="pointer-events-none order-2 z-[81] flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 overflow-x-auto max-sm:relative max-sm:bottom-auto max-sm:left-auto max-sm:ml-2 max-sm:pl-0 sm:fixed sm:bottom-8 sm:left-1/2 sm:order-none sm:ml-0 sm:max-w-none sm:-translate-x-1/2 sm:gap-2 sm:overflow-visible sm:pl-0">
        {ICON_BUTTONS.map(({ id, label, className, Glyph }) => (
          <button
            key={id}
            type="button"
            className={cn(
              "pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md",
              className,
            )}
            aria-label={label}
            onClick={() => handleIconClick(id)}
          >
            <Glyph />
          </button>
        ))}
      </div>

      {showCinePicker && picked && !isHomeInternalShortcut(picked.id) ? (
        <HomeSocialCinePickerDialog
          open={picked !== null}
          onOpenChange={(open) => !open && setPicked(null)}
          title={picked?.label ?? ""}
          onPickCine={onPickCine}
          onPickCineCam={onPickRedesCam}
        />
      ) : null}
    </>
  );
}
