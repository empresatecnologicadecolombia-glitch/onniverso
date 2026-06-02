import ColiseoBareImmersiveScene from "@/components/immersive/ColiseoBareImmersiveScene";
import { ESCENA_360_VR_TITLE } from "@/data/escena360vrVideos";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ColiseoBarePage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Volver"
        className="fixed left-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/60 bg-slate-950/95 text-violet-100 shadow-[0_0_28px_-4px_rgba(139,92,246,0.85)] backdrop-blur-md transition hover:border-violet-300 hover:bg-slate-900 hover:text-white"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
        }}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <p className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-violet-400/35 bg-black/55 px-3 py-1 text-[11px] text-violet-100/90 backdrop-blur-sm">
        {ESCENA_360_VR_TITLE}
      </p>
      <ColiseoBareImmersiveScene />
    </div>
  );
};

export default ColiseoBarePage;
