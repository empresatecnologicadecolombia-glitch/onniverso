import { ExternalLink, Globe2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { openOnniVersOnline } from "@/config/onniversOnline";

type OnniVersOnlineButtonProps = {
  className?: string;
  onClick?: () => void;
};

/**
 * CTA portal eventos — abre onnivers.online en nueva pestaña.
 */
export default function OnniVersOnlineButton({ className, onClick }: OnniVersOnlineButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (!openOnniVersOnline()) {
      toast.info("Enlace próximamente", {
        description: "onnivers.online — publicaremos el acceso en breve.",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.16 }}
      className={className}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label="Ir a onnivers.online"
        className="group relative isolate overflow-hidden rounded-2xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,hsl(292_85%_58%),hsl(320_80%_55%),hsl(260_75%_58%),hsl(292_85%_58%))] opacity-90 blur-[0.5px] transition-opacity duration-300 group-hover:opacity-100 [animation:onnivers-online-spin_4s_linear_infinite]"
        />
        <span
          aria-hidden
          className="absolute inset-[2px] rounded-[14px] bg-[hsl(232_42%_7%/0.92)] backdrop-blur-xl"
        />

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <span className="absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-fuchsia-200/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 [animation:onnivers-online-shimmer_2.8s_ease-in-out_infinite]" />
        </span>

        <span className="relative flex items-center gap-3 px-6 py-3 sm:px-7 sm:py-3.5">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 shadow-[0_0_24px_hsl(292_85%_58%/0.35)] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_32px_hsl(292_85%_58%/0.5)]"
          >
            <Globe2 className="h-4 w-4 text-fuchsia-100" strokeWidth={2.25} />
          </span>

          <span className="flex flex-col items-start text-left">
            <span className="flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-fuchsia-300/90 sm:text-[11px]">
              <Sparkles className="h-3 w-3 text-violet-300" aria-hidden />
              OnniVers Eventos
            </span>
            <span className="bg-gradient-to-r from-fuchsia-50 via-white to-violet-100 bg-clip-text font-headline text-base font-semibold tracking-wide text-transparent sm:text-lg">
              onnivers.online
            </span>
          </span>

          <ExternalLink
            aria-hidden
            className="ml-0.5 hidden h-4 w-4 shrink-0 text-fuchsia-300/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block"
          />
        </span>
      </button>

      <style>{`
        @keyframes onnivers-online-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes onnivers-online-shimmer {
          0%, 100% { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
          45% { opacity: 1; }
          55% { transform: translateX(220%) skewX(-12deg); opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}
