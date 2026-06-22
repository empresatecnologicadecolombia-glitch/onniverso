import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bot,
  GraduationCap,
  LayoutGrid,
  Mail,
  MessageCircle,
  Music2,
  Share2,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import OnniVersDownloadFileButton from "@/components/descargar/OnniVersDownloadFileButton";
import {
  ONNI_JARVIS_DOWNLOADS,
  ONNIVERS_EDUCATION_DOWNLOADS,
  ONNIVERS_EVENTOS_DOWNLOADS,
} from "@/config/appDownload";
import { ALT_CARD_ONNI_ECOSYSTEM } from "@/lib/seoBrand";

const ONNI_ECOSYSTEM_HERO_IMAGE = `${import.meta.env.BASE_URL}onni-ecosystem-metaverse.png`;
const EVENTOS_HERO_IMAGE = `${import.meta.env.BASE_URL}eventos-inmersivos.jpeg`;
const ONNI_JARVIS_HERO_IMAGE = `${import.meta.env.BASE_URL}images/oni.jpeg`;

const EDUCATION_SPECS = [
  "Windows 10/11 (64 bits) · instalador ligero · requiere conexión a onnivers.com",
  "Android 8+ · micrófono y almacenamiento para la APK de Educación",
  "Incluye: Mi Mundo, aulas virtuales, Coliseo, videos educativos y asistente Onni con voz",
];

const EVENTOS_SPECS = [
  "Windows 10/11 (64 bits) · aplicación dedicada a conciertos y live 360°",
  "Android 8+ · APK Eventos optimizada para transmisiones inmersivas",
  "Incluye: salas en vivo, streaming Mux/Agora, escenas 360° y aforo virtual",
];

const JARVIS_SPECS = [
  "Windows 10/11 (64 bits) · IA de escritorio independiente del navegador",
  "Automatiza publicaciones en redes, respuestas de correo y tareas repetitivas",
  "Control por Telegram + App Manager integrado para orquestar flujos y apps",
  "Proyecto OnniVers impulsado por inteligencia artificial central Onni",
];

export default function DescargarAppsPageContent() {
  return (
    <div className="relative mx-auto max-w-4xl space-y-10 pb-16">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="text-center"
      >
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.35em] text-cyan-400/90">
          Centro de descargas
        </p>
        <h1 className="mt-2 font-headline text-[clamp(1.75rem,5vw,2.75rem)] font-semibold tracking-wide text-white">
          Tres líneas de producto OnniVers
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-cyan-50/85 sm:text-base">
          OnniVers se divide en <strong className="text-white">Educación</strong> (ecosistema inmersivo completo),{" "}
          <strong className="text-white">Eventos</strong> (conciertos y live 360°) y{" "}
          <strong className="text-white">Onni Jarvis</strong> (IA de escritorio para automatizar redes, correo y
          operaciones vía Telegram). Descarga la app que corresponda a tu flujo.
        </p>
        <ul
          className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2"
          aria-label="Resumen de líneas de producto"
        >
          <li className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-100 sm:text-xs">
            1 · Educación
          </li>
          <li className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-100 sm:text-xs">
            2 · Eventos
          </li>
          <li className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-100 sm:text-xs">
            3 · Onni Jarvis
          </li>
        </ul>
      </motion.header>

      {/* Tarjeta Educación / Ecosistema */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.55 }}
      >
        <Card className="relative overflow-hidden border border-cyan-400/30 bg-card/50 shadow-[0_0_60px_-12px_hsl(186_100%_50%/0.45)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,hsl(186_100%_50%/0.06)_0%,transparent_45%,hsl(270_70%_50%/0.05)_100%)]" />
          <div className="relative h-52 overflow-hidden md:h-56">
            <img
              src={ONNI_ECOSYSTEM_HERO_IMAGE}
              alt={ALT_CARD_ONNI_ECOSYSTEM}
              className="h-full w-full object-cover object-[center_42%_38%] md:object-[center_45%_35%]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/35 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full border border-cyan-300/40 bg-slate-950/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-100 backdrop-blur-sm">
              Educación · Ecosistema
            </div>
          </div>
          <CardContent className="relative space-y-5 p-6">
            <div>
              <h2 className="font-display text-xl font-semibold md:text-[1.35rem]">
                <span className="bg-gradient-to-r from-cyan-100 via-white to-violet-200 bg-clip-text text-transparent">
                  OnniVerso: El Ecosistema Digital Inmersivo
                </span>
              </h2>
              <ul
                className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5"
                aria-label="Cuatro pilares de OnniVerso"
              >
                <li className="flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 sm:text-xs">
                  <Users className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                  Red Social
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-100 sm:text-xs">
                  <Music2 className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden />
                  Conciertos
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-amber-100 sm:text-xs">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                  Educación
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-100 sm:text-xs">
                  <Store className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
                  Tiendas
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                Plataforma inmersiva para aprender y conectar:{" "}
                <strong className="text-cyan-200/95">Red Social</strong>,{" "}
                <strong className="text-fuchsia-200/95">Conciertos</strong>,{" "}
                <strong className="text-amber-200/95">Educación</strong> y{" "}
                <strong className="text-emerald-200/95">Tiendas</strong> en una sola experiencia. Instala la app de
                Educación en PC o Android para acceder al ecosistema completo en onnivers.com.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-1">
              {ONNIVERS_EDUCATION_DOWNLOADS.map((asset) => (
                <OnniVersDownloadFileButton key={asset.id} asset={asset} accent="cyan" />
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300/90">
                Requisitos técnicos · Educación
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {EDUCATION_SPECS.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-cyan-400" aria-hidden>
                      ▸
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tarjeta Eventos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.55 }}
      >
        <Card className="relative overflow-hidden border border-fuchsia-400/30 bg-card/50 shadow-[0_0_60px_-12px_hsl(292_80%_55%/0.4)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,hsl(292_85%_55%/0.07)_0%,transparent_50%)]" />
          <div className="relative h-44 overflow-hidden">
            <img
              src={EVENTOS_HERO_IMAGE}
              alt="Conciertos inmersivos OnniVers: estadio virtual y experiencias 360°."
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
          </div>
          <CardContent className="relative space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="min-w-0 flex-1 font-display text-lg font-semibold text-foreground sm:text-xl">
                CONCIERTOS INMERSIVOS DE REALIDAD VIRTUAL
              </h2>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-fuchsia-400/45 bg-fuchsia-500/12 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-wider text-fuchsia-100 sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden />
                En vivo & 360°
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Línea dedicada a espectáculos: transmisiones 360° en vivo, realidad mixta y aforo virtual ilimitado. App
              separada de Educación — ideal para promotores, venues y audiencias que viven el show desde cualquier
              dispositivo.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {ONNIVERS_EVENTOS_DOWNLOADS.map((asset) => (
                <OnniVersDownloadFileButton key={asset.id} asset={asset} accent="fuchsia" />
              ))}
            </div>

            <div className="rounded-xl border border-fuchsia-400/20 bg-slate-950/50 p-4">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-fuchsia-300/90">
                Requisitos técnicos · Eventos
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {EVENTOS_SPECS.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-fuchsia-400" aria-hidden>
                      ▸
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tarjeta Onni Jarvis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.55 }}
      >
        <Card className="relative overflow-hidden border border-violet-400/35 bg-card/50 shadow-[0_0_60px_-12px_hsl(258_85%_58%/0.45)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,hsl(258_90%_58%/0.08)_0%,transparent_48%,hsl(186_100%_50%/0.04)_100%)]" />
          <div className="relative h-48 overflow-hidden sm:h-52 md:h-56">
            <img
              src={ONNI_JARVIS_HERO_IMAGE}
              alt="Centro de control Onni Jarvis: inteligencia artificial central del proyecto OnniVers."
              className="h-full w-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-card/10" />
            <div className="absolute left-4 top-4 rounded-full border border-violet-300/45 bg-slate-950/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-100 backdrop-blur-sm">
              IA · Automatización
            </div>
          </div>
          <CardContent className="relative space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="min-w-0 flex-1 font-display text-lg font-semibold sm:text-xl">
                <span className="bg-gradient-to-r from-violet-100 via-cyan-100 to-white bg-clip-text text-transparent">
                  ONNI JARVIS — Inteligencia Artificial Central
                </span>
              </h2>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-400/45 bg-violet-500/12 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-wider text-violet-100 sm:text-xs">
                <Bot className="h-3.5 w-3.5 text-violet-300" aria-hidden />
                Desktop AI
              </span>
            </div>

            <ul
              className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5"
              aria-label="Capacidades de Onni Jarvis"
            >
              <li className="flex items-center gap-2 rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-violet-100 sm:text-xs">
                <Share2 className="h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden />
                Redes sociales
              </li>
              <li className="flex items-center gap-2 rounded-lg border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-sky-100 sm:text-xs">
                <Mail className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden />
                Correo
              </li>
              <li className="flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 sm:text-xs">
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                Telegram
              </li>
              <li className="flex items-center gap-2 rounded-lg border border-indigo-400/35 bg-indigo-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-100 sm:text-xs">
                <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden />
                App Manager
              </li>
            </ul>

            <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              <strong className="text-violet-200/95">Onni Jarvis</strong> es la IA de escritorio que automatiza tu
              operación digital: publicaciones en redes, gestión de correo, flujos repetitivos y supervisión de apps.
              Se controla desde el PC y también vía <strong className="text-cyan-200/95">Telegram</strong>, con{" "}
              <strong className="text-indigo-200/95">App Manager</strong> para orquestar herramientas sin salir del
              ecosistema OnniVers.
            </p>

            <div className="grid gap-3">
              {ONNI_JARVIS_DOWNLOADS.map((asset) => (
                <OnniVersDownloadFileButton key={asset.id} asset={asset} accent="violet" />
              ))}
            </div>

            <div className="rounded-xl border border-violet-400/25 bg-slate-950/50 p-4">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-violet-300/90">
                Requisitos técnicos · Onni Jarvis
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {JARVIS_SPECS.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-violet-400" aria-hidden>
                      ▸
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
