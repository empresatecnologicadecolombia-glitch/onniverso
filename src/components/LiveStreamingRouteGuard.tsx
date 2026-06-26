import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isUserLiveStreamingEnabled } from "@/config/liveStreaming";

type LiveStreamingRouteGuardProps = {
  children: ReactNode;
  fallback?: string;
};

/** Bloquea rutas de emisor si USER_LIVE_STREAMING_ENABLED es false. */
export default function LiveStreamingRouteGuard({
  children,
  fallback = "/inicio",
}: LiveStreamingRouteGuardProps) {
  if (!isUserLiveStreamingEnabled()) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
