import { Download, MessageCircle, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnniVersDownloadAsset } from "@/config/appDownload";
import { openOnniVersDownload } from "@/config/appDownload";
import { toast } from "sonner";

type OnniVersDownloadFileButtonProps = {
  asset: OnniVersDownloadAsset;
  accent?: "cyan" | "fuchsia" | "violet";
  className?: string;
};

const accentRing: Record<NonNullable<OnniVersDownloadFileButtonProps["accent"]>, string> = {
  cyan: "border-cyan-400/45 hover:border-cyan-300/70 hover:shadow-[0_0_28px_hsl(186_100%_50%/0.35)]",
  fuchsia:
    "border-fuchsia-400/45 hover:border-fuchsia-300/70 hover:shadow-[0_0_28px_hsl(292_85%_58%/0.35)]",
  violet:
    "border-violet-400/45 hover:border-violet-300/70 hover:shadow-[0_0_28px_hsl(258_90%_62%/0.38)]",
};

const accentIcon: Record<NonNullable<OnniVersDownloadFileButtonProps["accent"]>, string> = {
  cyan: "text-cyan-300 bg-cyan-500/15 border-cyan-400/35",
  fuchsia: "text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/35",
  violet: "text-violet-300 bg-violet-500/15 border-violet-400/35",
};

export default function OnniVersDownloadFileButton({
  asset,
  accent = "cyan",
  className,
}: OnniVersDownloadFileButtonProps) {
  const PlatformIcon =
    asset.platform === "android" ? Smartphone : asset.platform === "telegram" ? MessageCircle : Monitor;

  const handleClick = () => {
    if (!openOnniVersDownload(asset.url)) {
      toast.info("Enlace de descarga próximamente", {
        description: `${asset.subtitle} — publicaremos el archivo en breve.`,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border bg-slate-950/70 px-4 py-3.5 text-left backdrop-blur-md transition-all duration-300 active:scale-[0.99]",
        accentRing[accent],
        className,
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
          accentIcon[accent],
        )}
      >
        <PlatformIcon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold text-white">{asset.label}</span>
        <span className="block truncate text-xs text-cyan-100/75">{asset.subtitle}</span>
      </span>
      <Download
        className="h-5 w-5 shrink-0 text-white/70 transition-transform group-hover:translate-y-0.5 group-hover:text-white"
        aria-hidden
      />
    </button>
  );
}
