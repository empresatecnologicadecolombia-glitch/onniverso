import { SpeedInsights } from "@vercel/speed-insights/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { isNativeAndroid } from "@/lib/nativePlayback";
import { installElectronMouseOnlyScroll } from "@/lib/electronMouseOnlyScroll";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { isPayPalConfigured, paypalScriptOptions } from "@/config/payments";
import GuestRoute from "@/components/auth/GuestRoute";
import PrivateRoute from "@/components/auth/PrivateRoute";
import LiveStreamingRouteGuard from "@/components/LiveStreamingRouteGuard";
import Index from "./pages/Index.tsx";
import { CameraBackgroundProvider } from "@/contexts/CameraBackgroundContext";

/** Rutas pesadas: no entran en el bundle inicial de la home. */
const EventPage = lazy(() => import("./pages/EventPage.tsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));
const TiendaPage = lazy(() => import("./pages/TiendaPage.tsx"));
const PodcastHubPage = lazy(() => import("./pages/PodcastHubPage.tsx"));
const PodcastRoomPage = lazy(() => import("./pages/PodcastRoomPage.tsx"));
const TeatroHub = lazy(() => import("./pages/TeatroHub.tsx"));
const SalaTeatro = lazy(() => import("./pages/SalaTeatro.tsx"));
const LobbyGlobalPage = lazy(() => import("./pages/LobbyGlobalPage.tsx"));
const ColiseoPage = lazy(() => import("./pages/ColiseoPage.tsx"));
const DocenteClasesPage = lazy(() => import("./pages/DocenteClasesPage.tsx"));
const DocenteConocimientoPage = lazy(() => import("./pages/DocenteConocimientoPage.tsx"));
const ClaseVirtualEntryPage = lazy(() => import("./pages/ClaseVirtualEntryPage.tsx"));
const LobbyImmersivePage = lazy(() => import("./pages/LobbyImmersivePage.tsx"));
const AulaVirtualPage = lazy(() => import("./pages/AulaVirtualPage.tsx"));
const EventosPage = lazy(() => import("./pages/EventosPage.tsx"));
const RedSocialInmersivaPage = lazy(() => import("./pages/RedSocialInmersivaPage.tsx"));
const InicioPage = lazy(() => import("./pages/InicioPage.tsx"));
const NuestrasSalasPage = lazy(() => import("./pages/NuestrasSalasPage.tsx"));
const ConciertosLiveConfigPage = lazy(() => import("./pages/ConciertosLiveConfigPage.tsx"));
const ConciertosLiveEmitirPage = lazy(() => import("./pages/ConciertosLiveEmitirPage.tsx"));
const ComunidadPage = lazy(() => import("./pages/ComunidadPage.tsx"));
const Galeria3DPage = lazy(() => import("./pages/Galeria3DPage.tsx"));
const ReproductorGaleriaPage = lazy(() => import("./pages/ReproductorGaleriaPage.tsx"));
const EducacionPage = lazy(() => import("./pages/EducacionPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PrivacidadPage = lazy(() => import("./pages/PrivacidadPage.tsx"));
const TerminosPage = lazy(() => import("./pages/TerminosPage.tsx"));
const QuienesSomosPage = lazy(() => import("./pages/QuienesSomosPage.tsx"));
const ContactoPage = lazy(() => import("./pages/ContactoPage.tsx"));
const DescargarAppsPage = lazy(() => import("./pages/DescargarAppsPage.tsx"));
const WelcomeUniversePage = lazy(() => import("./pages/WelcomeUniversePage.tsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.tsx"));
const UpdatePasswordPage = lazy(() => import("./pages/UpdatePasswordPage.tsx"));
const PcScenePage = lazy(() => import("./pages/PcScenePage.tsx"));
const EmisorView = lazy(() => import("./pages/EmisorView.tsx"));
const EspectadorView = lazy(() => import("./pages/EspectadorView.tsx"));
const LiveStreamPage = lazy(() => import("./pages/LiveStreamPage.tsx"));
const GoViewerPage = lazy(() => import("./pages/GoViewerPage.tsx"));

const OpAiAssistantLazy = lazy(() => import("@/components/OpAiAssistant"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-background text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}

/** Onni fuera del camino crítico: monta tras idle para no bloquear FCP/LCP. */
function DeferredOpAiAssistant() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const enable = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(enable, 1800);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <OpAiAssistantLazy />
    </Suspense>
  );
}

const AppProviders = ({ children }: { children: ReactNode }) =>
  isPayPalConfigured ? (
    <PayPalScriptProvider options={paypalScriptOptions}>{children}</PayPalScriptProvider>
  ) : (
    <>{children}</>
  );

const App = () => {
  useEffect(() => {
    if (isNativeAndroid()) {
      console.log("[Onniverso] WEB PLAYER BLOCKED ON ANDROID — App shell");
    }
  }, []);

  useEffect(() => installElectronMouseOnlyScroll(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {import.meta.env.PROD ? <SpeedInsights /> : null}
          <BrowserRouter>
            <CameraBackgroundProvider>
              <DeferredOpAiAssistant />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/descargar" element={<DescargarAppsPage />} />
                  <Route path="/inicio-2" element={<Navigate to="/" replace />} />
                  <Route
                    path="/inicio"
                    element={
                      <PrivateRoute>
                        <InicioPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/entrar"
                    element={
                      <GuestRoute>
                        <WelcomeUniversePage />
                      </GuestRoute>
                    }
                  />
                  <Route
                    path="/registro"
                    element={
                      <GuestRoute>
                        <RegisterPage />
                      </GuestRoute>
                    }
                  />
                  <Route path="/actualizar-contrasena" element={<UpdatePasswordPage />} />
                  <Route path="/auth" element={<AuthPage />} />

                  <Route path="/privacidad" element={<PrivacidadPage />} />
                  <Route path="/terminos" element={<TerminosPage />} />
                  <Route path="/quienes-somos" element={<QuienesSomosPage />} />
                  <Route path="/contacto" element={<ContactoPage />} />

                  <Route
                    path="/lobby-inmersivo"
                    element={
                      <PrivateRoute>
                        <LobbyImmersivePage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/aula-virtual"
                    element={
                      <PrivateRoute>
                        <AulaVirtualPage />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/eventos" element={<EventosPage />} />
                  <Route path="/red-social-inmersiva" element={<RedSocialInmersivaPage />} />
                  <Route
                    path="/pc"
                    element={
                      <PrivateRoute>
                        <LiveStreamingRouteGuard>
                          <PcScenePage />
                        </LiveStreamingRouteGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/sala/emisor"
                    element={
                      <PrivateRoute>
                        <LiveStreamingRouteGuard>
                          <EmisorView />
                        </LiveStreamingRouteGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/sala/espectador/:channel"
                    element={
                      <PrivateRoute>
                        <EspectadorView />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/nuestras-salas"
                    element={
                      <PrivateRoute>
                        <NuestrasSalasPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/conciertos-live/config"
                    element={
                      <PrivateRoute>
                        <LiveStreamingRouteGuard>
                          <ConciertosLiveConfigPage />
                        </LiveStreamingRouteGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/conciertos-live/emitir"
                    element={
                      <PrivateRoute>
                        <LiveStreamingRouteGuard>
                          <ConciertosLiveEmitirPage />
                        </LiveStreamingRouteGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/go/:streamId"
                    element={
                      <PrivateRoute>
                        <GoViewerPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/live-stream"
                    element={
                      <PrivateRoute>
                        <LiveStreamingRouteGuard>
                          <LiveStreamPage />
                        </LiveStreamingRouteGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/live-stream/:channel"
                    element={
                      <PrivateRoute>
                        <LiveStreamingRouteGuard>
                          <LiveStreamPage />
                        </LiveStreamingRouteGuard>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/comunidad"
                    element={
                      <PrivateRoute>
                        <ComunidadPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/3d"
                    element={
                      <PrivateRoute>
                        <Galeria3DPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/reproductor-galeria"
                    element={
                      <PrivateRoute>
                        <ReproductorGaleriaPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/educacion"
                    element={
                      <PrivateRoute>
                        <EducacionPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/event/:id"
                    element={
                      <PrivateRoute>
                        <EventPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/tienda"
                    element={
                      <PrivateRoute>
                        <TiendaPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/podcast-hub"
                    element={
                      <PrivateRoute>
                        <PodcastHubPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/podcast/:id"
                    element={
                      <PrivateRoute>
                        <PodcastRoomPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/teatro-hub"
                    element={
                      <PrivateRoute>
                        <TeatroHub />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/teatro/:id"
                    element={
                      <PrivateRoute>
                        <SalaTeatro />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/mi-mundo/lobby-global"
                    element={
                      <PrivateRoute>
                        <LobbyGlobalPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/coliseo"
                    element={
                      <PrivateRoute>
                        <ColiseoPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/docente-clases"
                    element={
                      <PrivateRoute>
                        <DocenteClasesPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/docente-conocimiento"
                    element={
                      <PrivateRoute>
                        <DocenteConocimientoPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/clase/:slug"
                    element={
                      <PrivateRoute>
                        <ClaseVirtualEntryPage />
                      </PrivateRoute>
                    }
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </CameraBackgroundProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AppProviders>
    </QueryClientProvider>
  );
};

export default App;
