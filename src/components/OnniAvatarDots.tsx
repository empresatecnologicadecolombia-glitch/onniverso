import { cn } from "@/lib/utils";
import OnniGalaxyCanvas from "@/components/onni-galaxy/OnniGalaxyCanvas";
import type { OnniAvatarState } from "@/components/OnniAvatar";
import type { OnniGalaxySize } from "@/components/onni-galaxy/types";

type OnniAvatarDotsProps = {
  size?: OnniGalaxySize;
  state?: OnniAvatarState;
  className?: string;
  title?: string;
};

const sizeBox = {
  sm: "h-10 w-10",
  md: "h-[55px] w-[55px]",
  lg: "h-[70px] w-[70px]",
  hero: "h-[336px] w-[336px]",
} as const;

/** Avatar central de ONI: galaxia espiral 3D (React Three Fiber). */
export default function OnniAvatarDots({
  size = "md",
  state = "idle",
  className,
  title = "Onni",
}: OnniAvatarDotsProps) {
  return (
    <div
      className={cn("onni-dots-avatar relative flex shrink-0 items-center justify-center overflow-hidden", sizeBox[size], className)}
      data-state={state}
      role="img"
      aria-label={title}
    >
      <OnniGalaxyCanvas size={size} state={state} className="h-full w-full" />
    </div>
  );
}
