import { Download, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type OnniVersDownloadAppButtonProps = {
  className?: string;
  onClick?: () => void;
};

/**
 * CTA descarga app — UI lista; la acción se conecta desde el padre cuando corresponda.
 */
export default function OnniVersDownloadAppButton({
  className,
  onClick,
}: OnniVersDownloadAppButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.08 }}
      className={className}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Centro de descarga OnniVers"
        className="group relative isolate max-w-[min(100%,18.5rem)] overflow-hidden rounded-xl px-0.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-w-none sm:rounded-2xl sm:px-1 sm:py-1"
      >
        {/* Anillo exterior animado */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,hsl(175_90%_48%),hsl(260_75%_58%),hsl(190_85%_52%),hsl(175_90%_48%))] opacity-90 blur-[0.5px] transition-opacity duration-300 group-hover:opacity-100 [animation:onnivers-dl-spin_4s_linear_infinite]"
        />
        <span
          aria-hidden
          className="absolute inset-[2px] rounded-[14px] bg-[hsl(232_42%_7%/0.92)] backdrop-blur-xl"
        />

        {/* Brillo deslizante */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <span className="absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 [animation:onnivers-dl-shimmer_2.8s_ease-in-out_infinite]" />
        </span>

        <span className="relative flex max-w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_24px_hsl(175_80%_50%/0.35)] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_32px_hsl(175_80%_55%/0.5)] sm:h-10 sm:w-10 sm:rounded-xl"
          >
            <Download className="h-4 w-4 text-cyan-100 sm:h-5 sm:w-5" strokeWidth={2.25} />
          </span>

          <span className="min-w-0 flex flex-col items-start text-left">
            <span className="flex items-center gap-1 font-display text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-300/90 sm:gap-1.5 sm:text-[10px] sm:tracking-[0.28em] md:text-[11px]">
              <Sparkles className="h-2.5 w-2.5 text-violet-300 sm:h-3 sm:w-3" aria-hidden />
              OnniVers PC
            </span>
            <span className="bg-gradient-to-r from-cyan-50 via-white to-violet-100 bg-clip-text font-headline text-sm font-semibold tracking-wide text-transparent sm:text-base md:text-lg">
              Centro de descarga
            </span>
          </span>

          <span
            aria-hidden
            className="ml-1 hidden h-8 w-px bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent sm:block"
          />
          <span
            aria-hidden
            className="hidden font-mono text-[10px] uppercase tracking-widest text-cyan-400/70 sm:inline"
          >
            .exe
          </span>
        </span>
      </button>

      <style>{`
        @keyframes onnivers-dl-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes onnivers-dl-shimmer {
          0%, 100% { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
          45% { opacity: 1; }
          55% { transform: translateX(220%) skewX(-12deg); opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}
