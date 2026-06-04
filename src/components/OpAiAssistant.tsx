import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Send, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatar from "@/components/OnniAvatar";
import HomeSocialRedesRow from "@/components/HomeSocialRedesRow";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOnniIntroduction } from "@/data/onniBrain";
import { getOpAssistantHint, resolveOpCommand } from "@/lib/opAssistantResolver";
import { askOnniGemini, isOnniNavigationResult } from "@/lib/onniGemini";
import { invokeOpenGalleryDirect } from "@/lib/galleryOpenDirect";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";
import { publishOnniAulaKnowledge } from "@/lib/onniAulaKnowledgeBoard";
import { extractWikipediaTopic, fetchWikipediaSummary } from "@/lib/wikipediaSummary";
import {
  getHomeSocialUrl,
  loadHomeSocialRedesConfig,
  type HomeSocialIconId,
} from "@/lib/homeSocialRedesConfig";
import { openHomeSocialRedes } from "@/lib/homeSocialRedesOpen";
import { useOnniChatVoice } from "@/hooks/useOnniChatVoice";

type UiMessage = { role: "user" | "assistant"; text: string };

function appendAssistantAnswer(
  setMessages: Dispatch<SetStateAction<UiMessage[]>>,
  sessionRef: MutableRefObject<{ lastAnswer?: string }>,
  answer: string,
  speak: (text: string) => void,
) {
  sessionRef.current.lastAnswer = answer;
  setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
  speak(answer);
}

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: "assistant", text: getOnniIntroduction() },
  ]);
  const sessionRef = useRef<{ lastAnswer?: string }>({});
  const pendingVoiceRef = useRef("");

  const {
    voiceListening,
    setVoiceListening,
    speakAnswer,
    startVoiceCapture,
    stopVoiceCapture,
    canListen,
    canSpeak,
  } = useOnniChatVoice();

  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);
  const isColiseoClassScene = location.pathname.startsWith("/coliseo");
  const isAulaVirtualScene = location.pathname === "/aula-virtual";
  const shiftOnniRight = isColiseoClassScene || isAulaVirtualScene;
  const showSocialIcons = location.pathname === "/";

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setProcessing(true);

      try {
        const result = resolveOpCommand(trimmed, location.pathname, {
          lastAnswer: sessionRef.current.lastAnswer,
        });

        if (isOnniNavigationResult(result)) {
          sessionRef.current.lastAnswer = result.answer;

          if (result.navigateBack) {
            navigate(-1);
          } else if (result.navigateTo) {
            if (result.navigateTo === "/reproductor-galeria" && invokeOpenGalleryDirect()) {
              // Mantener exactamente la misma experiencia del icono de inicio en Android.
            } else if (result.navigateTo === "/coliseo" && invokeOpenColiceoDirect()) {
              // Mantener exactamente la misma experiencia del icono Coliseo en Android.
            } else if (result.navigateTo.startsWith("home-social:")) {
              const iconId = result.navigateTo.replace("home-social:", "").trim() as HomeSocialIconId;
              const icons = loadHomeSocialRedesConfig();
              openHomeSocialRedes(getHomeSocialUrl(icons, iconId, "redes"));
            } else {
              const [path, hash] = result.navigateTo.split("#");
              if (hash) {
                navigate(path);
                window.setTimeout(() => {
                  document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 400);
              } else {
                navigate(result.navigateTo);
              }
            }
          }
          if (result.command) dispatchOpCommand(result.command);
          appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
          return result.answer;
        }

        const geminiAnswer = await askOnniGemini({
          message: trimmed,
          contextPath: location.pathname,
        });
        const asksAboutGemini = /\b(gemini|ia externa|conectad[ao]?\s+a?\s*gemini)\b/i.test(trimmed);
        if (geminiAnswer) {
          if (location.pathname.startsWith("/aula-virtual") || location.pathname.startsWith("/coliseo")) {
            publishOnniAulaKnowledge({
              title: trimmed.slice(0, 60),
              shortText: geminiAnswer.slice(0, 280),
              fullText: geminiAnswer,
              sourceUrl: "https://ai.google.dev/gemini-api/docs",
            });
          }
          appendAssistantAnswer(setMessages, sessionRef, geminiAnswer, speakAnswer);
          return geminiAnswer;
        }

        if (asksAboutGemini) {
          const fallbackGemini =
            "Sí, estoy conectada a Google Gemini para preguntas libres. Ahora mismo la API no respondió (cuota o red); inténtalo de nuevo en un minuto.";
          appendAssistantAnswer(setMessages, sessionRef, fallbackGemini, speakAnswer);
          return fallbackGemini;
        }

        const wikiTopic = extractWikipediaTopic(trimmed);
        if (wikiTopic) {
          try {
            const wiki = await fetchWikipediaSummary(wikiTopic);
            const shortAnswer = wiki
              ? `${wiki.title}: ${wiki.shortText}`
              : "No encontré un resultado claro en Wikipedia para eso. Prueba con otro nombre.";
            if (wiki && (location.pathname.startsWith("/aula-virtual") || location.pathname.startsWith("/coliseo"))) {
              publishOnniAulaKnowledge({
                title: wiki.title,
                shortText: wiki.shortText,
                fullText: wiki.fullText,
                sourceUrl: wiki.canonicalUrl,
              });
            }
            appendAssistantAnswer(setMessages, sessionRef, shortAnswer, speakAnswer);
            return shortAnswer;
          } catch {
            /* Wikipedia falló; seguimos con la respuesta local */
          }
        }

        sessionRef.current.lastAnswer = result.answer;
        appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
        return result.answer;
      } finally {
        setProcessing(false);
      }
    },
    [location.pathname, navigate, speakAnswer],
  );

  const voiceCallbacks = useMemo(
    () => ({
      onTranscript: (transcript: string) => {
        setText("");
        void runCommand(transcript);
      },
      onError: (errorText: string) => {
        setMessages((prev) => [...prev, { role: "assistant", text: errorText }]);
      },
      onFallbackToNative: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "La voz del navegador no respondió; uso la voz nativa de la app.",
          },
        ]);
      },
    }),
    [runCommand],
  );

  const handleStartVoiceCapture = useCallback(() => {
    pendingVoiceRef.current = "";
    setText("");
    startVoiceCapture(voiceCallbacks);
  }, [startVoiceCapture, voiceCallbacks]);

  const stopVoiceCaptureHandler = useCallback(() => {
    const transcript = stopVoiceCapture();
    setText("");
    if (transcript) void runCommand(transcript);
  }, [runCommand, stopVoiceCapture]);

  const onSpeakLastAnswer = useCallback(() => {
    const textToSpeak = sessionRef.current.lastAnswer?.trim();
    if (!textToSpeak) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Aún no tengo una respuesta para leer en voz alta." },
      ]);
      return;
    }
    if (!canSpeak) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "La voz no está disponible en este navegador." },
      ]);
      return;
    }
    speakAnswer(textToSpeak);
  }, [canSpeak, speakAnswer]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    void runCommand(trimmed);
  };

  return (
    <div
      className={`pointer-events-none fixed z-[80] w-[min(92vw,380px)] max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-2 sm:block ${
        shiftOnniRight
          ? "bottom-10 left-12 max-sm:bottom-12 max-sm:left-14 sm:bottom-8 sm:left-[4.5rem]"
          : "bottom-10 left-4 sm:bottom-8 sm:left-10"
      }`}
    >
      {!open ? (
        <button
          type="button"
          className="pointer-events-auto relative z-[90] order-1 group flex flex-col items-center gap-1.5 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
          onClick={() => setOpen(true)}
          aria-label="Abrir Onni, asistente de texto"
        >
          <OnniAvatar size="lg" state="idle" className="max-sm:h-16" />
        </button>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-start gap-3 border-b border-white/10 px-3 py-3">
            <OnniAvatar size="md" state="idle" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cyan-100">Onni</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <div className="h-52 space-y-2 overflow-y-auto px-3 py-2">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                    m.role === "user" ? "bg-cyan-500/25 text-cyan-50" : "bg-white/10 text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">{hint}</p>
          </div>
          <form onSubmit={onSend} className="flex items-center gap-2 border-t border-white/10 p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="conciertos, lobby, ayuda o pregunta libre"
            />
            {canListen && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={onSpeakLastAnswer}
                  disabled={!canSpeak}
                  aria-label="Escuchar la última respuesta de Onni"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={voiceListening ? "secondary" : "outline"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    handleStartVoiceCapture();
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    stopVoiceCaptureHandler();
                  }}
                  onPointerCancel={(event) => {
                    event.preventDefault();
                    stopVoiceCaptureHandler();
                  }}
                  onPointerLeave={(event) => {
                    if (!voiceListening) return;
                    event.preventDefault();
                    stopVoiceCaptureHandler();
                  }}
                  onContextMenu={(event) => event.preventDefault()}
                  aria-label={voiceListening ? "Detener micrófono de Onni" : "Hablar con Onni"}
                >
                  {voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </>
            )}
            <Button type="submit" size="icon" variant="hero" aria-label="Enviar" disabled={processing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      {showSocialIcons && <HomeSocialRedesRow />}
    </div>
  );
}
