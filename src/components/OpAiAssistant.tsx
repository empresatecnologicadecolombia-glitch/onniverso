import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Send, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatarDots from "@/components/OnniAvatarDots";
import HomeSocialRedesRow from "@/components/HomeSocialRedesRow";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOnniIntroduction } from "@/data/onniBrain";
import { toast } from "sonner";
import { getOpAssistantHint, resolveOpCommand, shouldAskOnniGemini } from "@/lib/opAssistantResolver";
import { askOnniGemini, isOnniNavigationResult } from "@/lib/onniGemini";
import { askOnniOllama, isOnniOllamaAvailable } from "@/lib/onniOllama";
import { invokeOpenGalleryDirect } from "@/lib/galleryOpenDirect";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";
import { publishOnniAulaKnowledge } from "@/lib/onniAulaKnowledgeBoard";
import { extractWikipediaTopic, fetchWikipediaSummary } from "@/lib/wikipediaSummary";
import {
  getHomeInternalShortcutPath,
  getHomeSocialUrl,
  loadHomeSocialRedesConfig,
  type HomeSocialIconId,
} from "@/lib/homeSocialRedesConfig";
import { openHomeSocialRedes } from "@/lib/homeSocialRedesOpen";
import { shouldShowNativeVoiceError } from "@/lib/onniNativeVoiceErrors";
import { useOnniChatVoice } from "@/hooks/useOnniChatVoice";
import OpAiAndroidAzureMic from "@/components/OpAiAndroidAzureMic";
import OpAiElectronAzureMic from "@/components/OpAiElectronAzureMic";
import { useOnniAzureMic } from "@/hooks/useOnniAzureMic";
import { useOnniVoice } from "@/hooks/useOnniVoice";
import { useAuth } from "@/hooks/useAuth";
import { isDesktopWebBrowser, isElectronDesktopApp, isOnniAndroidVoice, usesOnniElevenLabsVoice } from "@/lib/deviceDetection";
import { isAzureMicSupported } from "@/lib/onniAzureStt";
import type { OnniSpeakOptions } from "@/lib/onniVoiceRuntime";
import { supabase } from "@/integrations/supabase/client";
import {
  buildOnniAiHistory,
  loadOnniChatMessages,
  saveOnniChatMessages,
  type OnniChatTurn,
} from "@/lib/onniChatMemory";

type UiMessage = OnniChatTurn;

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function appendAssistantAnswer(
  setMessages: Dispatch<SetStateAction<UiMessage[]>>,
  sessionRef: MutableRefObject<{ lastAnswer?: string; lastAnswerFromGemini?: boolean }>,
  answer: string,
  speak: (text: string, options?: OnniSpeakOptions) => void,
  speakOptions?: OnniSpeakOptions,
) {
  sessionRef.current.lastAnswer = answer;
  sessionRef.current.lastAnswerFromGemini = speakOptions?.fromGemini ?? false;
  setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
  speak(answer, speakOptions);
}

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [androidMicState, setAndroidMicState] = useState({ isRecording: false, isProcessing: false });
  const [electronMicState, setElectronMicState] = useState({ isRecording: false, isProcessing: false });
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [onniSpeaking, setOnniSpeaking] = useState(false);
  const introMessage = useMemo<UiMessage>(
    () => ({ role: "assistant", text: getOnniIntroduction() }),
    [],
  );
  const [messages, setMessages] = useState<UiMessage[]>([introMessage]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<{ lastAnswer?: string; lastAnswerFromGemini?: boolean }>({});
  const appRoleRef = useRef<string | null>(null);
  const pendingVoiceRef = useRef("");
  const electronSpaceHoldRef = useRef(false);
  const chromeSpaceHoldRef = useRef(false);
  const { user } = useAuth();
  const [appRole, setAppRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAppRole(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("app_role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setAppRole((data as { app_role?: string } | null)?.app_role ?? "particular");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  appRoleRef.current = appRole;

  useEffect(() => {
    setMessages(loadOnniChatMessages(user?.id, [introMessage]));
  }, [user?.id, introMessage]);

  useEffect(() => {
    saveOnniChatMessages(user?.id, messages);
  }, [messages, user?.id]);

  useEffect(() => {
    if (!open) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, processing]);

  useEffect(() => {
    if (!isOnniAndroidVoice()) return;
    const onSpeakStart = () => setOnniSpeaking(true);
    const onSpeakEnd = () => window.setTimeout(() => setOnniSpeaking(false), 400);
    window.addEventListener("voice:speak-start", onSpeakStart);
    window.addEventListener("voice:speak-end", onSpeakEnd);
    window.addEventListener("voice:spoke", onSpeakEnd);
    return () => {
      window.removeEventListener("voice:speak-start", onSpeakStart);
      window.removeEventListener("voice:speak-end", onSpeakEnd);
      window.removeEventListener("voice:spoke", onSpeakEnd);
    };
  }, []);

  const {
    voiceListening,
    nativeWakeListening,
    electronFollowUpActive,
    voiceCaptureActive,
    setVoiceListening,
    speakAnswer,
    startVoiceCapture,
    stopVoiceCapture,
    toggleVoiceCapture,
    startNativeWakeListening,
    stopNativeWakeListening,
    usesContinuousMic,
    usesOneShotNativeMic,
    supportsNativeWakeSwitch,
    canListen,
    canSpeak,
  } = useOnniChatVoice();

  const showAzureMic = usesOnniElevenLabsVoice() && isAzureMicSupported();
  const showElectronMic = isElectronDesktopApp() && isAzureMicSupported();
  /** Chrome/Edge escritorio: mic Web Speech solo si no hay mic ElevenLabs. */
  const showChromeWebPushToTalk = isDesktopWebBrowser() && canListen && !showAzureMic;

  const runCommandRef = useRef<(raw: string) => Promise<string | undefined>>(async () => undefined);
  const openRef = useRef(open);
  openRef.current = open;

  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);
  const inputPlaceholder = "videos educativos, lobby, ayuda o pregunta libre";
  const isColiseoClassScene = location.pathname.startsWith("/coliseo");
  const isAulaVirtualScene = location.pathname === "/aula-virtual";
  const shiftOnniRight = isColiseoClassScene || isAulaVirtualScene;
  /** Iconos sociales y Onni grande solo en Mi Mundo (`/inicio`), no en la landing pública (`/`). */
  const showSocialIcons = location.pathname === "/inicio";
  const isHomePortada = location.pathname === "/inicio";

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setProcessing(true);

      try {
        let roleForCommand = appRoleRef.current;
        if (roleForCommand === null && user?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("app_role")
            .eq("id", user.id)
            .maybeSingle();
          roleForCommand = (data as { app_role?: string } | null)?.app_role ?? "particular";
          appRoleRef.current = roleForCommand;
          setAppRole(roleForCommand);
        }

        const result = resolveOpCommand(trimmed, location.pathname, {
          lastAnswer: sessionRef.current.lastAnswer,
          appRole: roleForCommand,
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
              const internalPath = getHomeInternalShortcutPath(iconId);
              if (internalPath) {
                navigate(internalPath);
              } else {
                const icons = loadHomeSocialRedesConfig();
                openHomeSocialRedes(getHomeSocialUrl(icons, iconId, "redes"));
              }
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
          if (result.command) {
            const isDocenteVoiceCmd =
              result.command.type === "docente.startClass" ||
              result.command.type === "docente.enterClass" ||
              result.command.type === "docente.endClass";
            const needsMountDelay = Boolean(result.navigateTo) && isDocenteVoiceCmd;
            const dispatchDelay = needsMountDelay ? 1_000 : isDocenteVoiceCmd ? 300 : 0;
            window.setTimeout(() => dispatchOpCommand(result.command!), dispatchDelay);
          }
          appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
          return result.answer;
        }

        // En el .exe con Ollama corriendo, la conversación libre la responde primero
        // la IA local (los comandos/navegación ya se resolvieron arriba). Sin Ollama,
        // o fuera del .exe, la respuesta local enlatada se mantiene como siempre.
        const ollamaTakesOver = isElectronDesktopApp() && (await isOnniOllamaAvailable());

        if (!shouldAskOnniGemini(result) && !ollamaTakesOver) {
          sessionRef.current.lastAnswer = result.answer;
          appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
          return result.answer;
        }

        const conversationHistory = buildOnniAiHistory(messagesRef.current);

        // Solo .exe: intenta primero la IA local (Ollama) con streaming en pantalla.
        // Si Ollama no está corriendo o falla, sigue el flujo Gemini de siempre.
        if (ollamaTakesOver) {
          let streamStarted = false;
          const ollamaAnswer = await askOnniOllama(
            { message: trimmed, contextPath: location.pathname, history: conversationHistory },
            (partial) => {
              if (!streamStarted) {
                streamStarted = true;
                setMessages((prev) => [...prev, { role: "assistant", text: partial }]);
              } else {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { role: "assistant", text: partial };
                  }
                  return next;
                });
              }
            },
          );
          if (ollamaAnswer) {
            sessionRef.current.lastAnswer = ollamaAnswer;
            sessionRef.current.lastAnswerFromGemini = false;
            if (streamStarted) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { role: "assistant", text: ollamaAnswer };
                }
                return next;
              });
              speakAnswer(ollamaAnswer);
            } else {
              appendAssistantAnswer(setMessages, sessionRef, ollamaAnswer, speakAnswer);
            }
            return ollamaAnswer;
          }
        }

        const geminiAnswer = await askOnniGemini({
          message: trimmed,
          contextPath: location.pathname,
          history: conversationHistory,
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
          appendAssistantAnswer(setMessages, sessionRef, geminiAnswer, speakAnswer, { fromGemini: true });
          return geminiAnswer;
        }

        if (asksAboutGemini) {
          const fallbackGemini =
            "Sí, estoy conectada a Google Gemini para preguntas libres. Ahora mismo la API no respondió (cuota o red); inténtalo de nuevo en un minuto.";
          appendAssistantAnswer(setMessages, sessionRef, fallbackGemini, speakAnswer, { fromGemini: true });
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
    [location.pathname, navigate, speakAnswer, user?.id],
  );

  runCommandRef.current = runCommand;

  const azureMicCallbacks = useMemo(
    () => ({
      onCommand: (command: string) => {
        void runCommandRef.current(command);
      },
      onWakeWithoutCommand: () => {
        const prompt = getOnniIntroduction();
        sessionRef.current.lastAnswer = prompt;
        if (openRef.current) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: "Hola Onni" },
            { role: "assistant", text: prompt },
          ]);
        }
        speakAnswer(prompt);
      },
      onError: (message: string) => {
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: message }]);
        } else {
          toast.error(message);
        }
      },
    }),
    [speakAnswer],
  );

  const electronAzureMic = useOnniAzureMic(azureMicCallbacks);
  const {
    isRecording: electronMicRecording,
    isProcessing: electronMicProcessing,
    beginHold: electronMicBeginHold,
    endHold: electronMicEndHold,
    cancel: electronMicCancel,
  } = electronAzureMic;

  useEffect(() => {
    if (!showElectronMic) return;
    setElectronMicState({
      isRecording: electronMicRecording,
      isProcessing: electronMicProcessing,
    });
  }, [showElectronMic, electronMicRecording, electronMicProcessing]);

  useEffect(() => {
    if (!showElectronMic || open || electronSpaceHoldRef.current) return;
    electronMicCancel();
  }, [open, showElectronMic, electronMicCancel]);

  useEffect(() => {
    if (!showElectronMic) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat) return;
      if (isEditableKeyboardTarget(event.target)) return;
      if (processing || electronMicProcessing) return;
      event.preventDefault();
      electronSpaceHoldRef.current = true;
      void electronMicBeginHold();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (!electronSpaceHoldRef.current) return;
      electronSpaceHoldRef.current = false;
      event.preventDefault();
      void electronMicEndHold();
    };

    const onBlur = () => {
      if (!electronSpaceHoldRef.current) return;
      electronSpaceHoldRef.current = false;
      void electronMicEndHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    showElectronMic,
    processing,
    electronMicProcessing,
    electronMicBeginHold,
    electronMicEndHold,
  ]);

  const wakeWordActive = false;

  const captureMicActive = voiceCaptureActive;

  const nativeWakeActive =
    !isOnniAndroidVoice() &&
    !isElectronDesktopApp() &&
    !isDesktopWebBrowser() &&
    supportsNativeWakeSwitch &&
    canListen &&
    !processing &&
    !voiceCaptureActive;

  const { isListening: wakeListening, isSpeaking: wakeSpeaking } = useOnniVoice({
    enabled: wakeWordActive,
    speakEnabled: canSpeak,
    onWake: (command) => {
      void runCommandRef.current(command);
    },
    onWakeWithoutCommand: () => {
      const prompt = getOnniIntroduction();
      sessionRef.current.lastAnswer = prompt;
      setMessages((prev) => [
        ...prev,
        { role: "user", text: "Hola Onni" },
        { role: "assistant", text: prompt },
      ]);
      speakAnswer(prompt);
    },
      onError: (message) => {
        if (!shouldShowNativeVoiceError(message)) return;
        if (openRef.current) {
        setMessages((prev) => [...prev, { role: "assistant", text: message }]);
      } else {
        toast.error(message);
      }
    },
  });

  const avatarState =
    wakeSpeaking
      ? "speaking"
      : wakeListening || voiceListening || nativeWakeListening || androidMicState.isRecording || electronMicState.isRecording || captureMicActive
        ? "listening"
        : "idle";

  const nativeWakeCallbacks = useMemo(
    () => ({
      onWake: (command: string) => {
        void runCommandRef.current(command);
      },
      onWakeWithoutCommand: () => {
        const prompt = getOnniIntroduction();
        sessionRef.current.lastAnswer = prompt;
        if (openRef.current) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: "Hola Onni" },
            { role: "assistant", text: prompt },
          ]);
        }
        speakAnswer(prompt);
      },
      onError: (message: string) => {
        if (!shouldShowNativeVoiceError(message)) return;
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: message }]);
        } else {
          toast.error(message);
        }
      },
    }),
    [speakAnswer],
  );
  const nativeWakeCallbacksRef = useRef(nativeWakeCallbacks);
  nativeWakeCallbacksRef.current = nativeWakeCallbacks;

  useEffect(() => {
    if (isOnniAndroidVoice()) return;

    if (!nativeWakeActive) {
      stopNativeWakeListening();
      return;
    }

    let cancelled = false;
    void startNativeWakeListening(nativeWakeCallbacksRef.current).then((started) => {
      if (!cancelled && !started) stopNativeWakeListening();
    });

    return () => {
      cancelled = true;
      stopNativeWakeListening();
    };
  }, [nativeWakeActive, startNativeWakeListening, stopNativeWakeListening]);

  const voiceCallbacks = useMemo(
    () => ({
      onTranscript: (transcript: string) => {
        setText("");
        void runCommand(transcript);
      },
      onError: (errorText: string) => {
        if (!shouldShowNativeVoiceError(errorText)) return;
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: errorText }]);
        } else {
          toast.error(errorText);
        }
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

  const handleToggleVoiceCapture = useCallback(() => {
    pendingVoiceRef.current = "";
    setText("");
    void toggleVoiceCapture(voiceCallbacks);
  }, [toggleVoiceCapture, voiceCallbacks]);

  const stopVoiceCaptureHandler = useCallback(() => {
    const transcript = stopVoiceCapture();
    setText("");
    if (transcript) void runCommand(transcript);
  }, [runCommand, stopVoiceCapture]);

  useEffect(() => {
    if (!showChromeWebPushToTalk || open || chromeSpaceHoldRef.current) return;
    if (voiceCaptureActive) stopVoiceCapture();
  }, [open, showChromeWebPushToTalk, voiceCaptureActive, stopVoiceCapture]);

  useEffect(() => {
    if (!showChromeWebPushToTalk) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat) return;
      if (isEditableKeyboardTarget(event.target)) return;
      if (processing || captureMicActive) return;
      event.preventDefault();
      chromeSpaceHoldRef.current = true;
      handleStartVoiceCapture();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (!chromeSpaceHoldRef.current) return;
      chromeSpaceHoldRef.current = false;
      event.preventDefault();
      stopVoiceCaptureHandler();
    };

    const onBlur = () => {
      if (!chromeSpaceHoldRef.current) return;
      chromeSpaceHoldRef.current = false;
      stopVoiceCaptureHandler();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    showChromeWebPushToTalk,
    processing,
    captureMicActive,
    handleStartVoiceCapture,
    stopVoiceCaptureHandler,
  ]);

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
    speakAnswer(textToSpeak, {
      fromGemini: sessionRef.current.lastAnswerFromGemini ?? false,
    });
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
        isHomePortada && !open
          ? "bottom-10 left-1/2 max-w-none -translate-x-1/2 max-sm:bottom-14 sm:bottom-8"
          : shiftOnniRight
            ? "bottom-10 left-12 max-sm:bottom-12 max-sm:left-14 sm:bottom-8 sm:left-[4.5rem]"
            : "bottom-10 left-4 sm:bottom-8 sm:left-10"
      }`}
    >
      {!open ? (
        <button
          type="button"
          className={`pointer-events-auto relative z-[90] order-1 group flex flex-col items-center gap-3 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
            isHomePortada
              ? "fixed left-1/2 bottom-24 -translate-x-1/2 max-sm:bottom-28"
              : ""
          }`}
          onClick={() => setOpen(true)}
          aria-label={
            captureMicActive
              ? "Suelta Espacio o el micrófono para enviar a Onni"
              : wakeListening || nativeWakeListening
              ? "Onni escuchando. Di Hola Onni y tu pedido"
              : "Abrir Onni, asistente de voz y texto"
          }
        >
          <OnniAvatarDots
            size={isHomePortada ? "hero" : "lg"}
            state={avatarState}
            className={isHomePortada ? "max-sm:h-64 max-sm:w-64" : "max-sm:h-16 max-sm:w-16"}
          />
        </button>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-start gap-3 border-b border-white/10 px-3 py-3">
            <OnniAvatarDots size="md" state={avatarState} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cyan-100">Onni</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <div className="h-[min(42dvh,18rem)] space-y-2 overflow-y-auto px-3 py-2">
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
            <div ref={chatEndRef} aria-hidden />
            <p className="text-[11px] text-muted-foreground">{hint}</p>
            {usesOneShotNativeMic && captureMicActive && !isOnniAndroidVoice() && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Escuchando en OnniVers… di tu pedido completo (ej. «llévame a clases»).
              </p>
            )}
            {usesContinuousMic && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Micrófono activo — habla cuando quieras. Pulsa el micrófono otra vez para apagar.
              </p>
            )}
            {showAzureMic && androidMicState.isRecording && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… di «Hola Onni, llévame a…» y pulsa el mic otra vez.
              </p>
            )}
            {showAzureMic && androidMicState.isProcessing && (
              <p className="text-[10px] font-medium text-emerald-300/90">Transcribiendo con ElevenLabs…</p>
            )}
            {showElectronMic && electronMicState.isRecording && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… mantén pulsado el micrófono y di tu pedido.
              </p>
            )}
            {showElectronMic && electronMicState.isProcessing && (
              <p className="text-[10px] font-medium text-emerald-300/90">Transcribiendo con ElevenLabs…</p>
            )}
            {showChromeWebPushToTalk && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… mantén pulsado el micrófono o Espacio y di tu pedido.
              </p>
            )}
            {supportsNativeWakeSwitch &&
              nativeWakeListening &&
              !captureMicActive &&
              !isOnniAndroidVoice() &&
              !isDesktopWebBrowser() && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                {isElectronDesktopApp()
                  ? electronFollowUpActive
                    ? "Te escucho — di tu pedido (sin repetir «Hola Onni»)."
                    : "Di «Hola Onni, llévame a…» en una frase, o solo «Hola Onni» y luego tu pedido."
                  : "Onni te escucha — di «Hola Onni» o «Onni…» + tu pedido."}
              </p>
            )}
          </div>
          <form onSubmit={onSend} className="flex items-center gap-2 border-t border-white/10 p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={inputPlaceholder}
            />
            {(canSpeak || canListen || showAzureMic || showElectronMic) && (
              <>
                {canSpeak && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={onSpeakLastAnswer}
                    aria-label="Escuchar la última respuesta de Onni"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
                {showAzureMic && (
                  <OpAiAndroidAzureMic
                    callbacks={azureMicCallbacks}
                    processing={processing || onniSpeaking}
                    panelOpen={open}
                    onStateChange={setAndroidMicState}
                  />
                )}
                {showElectronMic && (
                  <OpAiElectronAzureMic
                    processing={processing || onniSpeaking}
                    isRecording={electronMicRecording}
                    isProcessing={electronMicProcessing}
                    beginHold={electronMicBeginHold}
                    endHold={electronMicEndHold}
                  />
                )}
                {canListen && (
                  <Button
                    type="button"
                    size="icon"
                    variant={captureMicActive ? "secondary" : "outline"}
                    onClick={
                      usesOneShotNativeMic
                        ? () => void handleToggleVoiceCapture()
                        : usesContinuousMic
                          ? () => void handleToggleVoiceCapture()
                          : undefined
                    }
                    onPointerDown={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            handleStartVoiceCapture();
                          }
                    }
                    onPointerUp={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onPointerCancel={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onPointerLeave={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            if (!captureMicActive) return;
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onContextMenu={(event) => event.preventDefault()}
                    aria-label={
                      captureMicActive
                        ? usesOneShotNativeMic
                          ? "Detener micrófono de Onni"
                          : usesContinuousMic
                            ? "Detener micrófono de Onni"
                            : "Soltar micrófono de Onni"
                        : usesOneShotNativeMic
                          ? "Pulsa y di tu pedido a Onni"
                          : usesContinuousMic
                            ? "Activar micrófono de Onni (escucha continua)"
                            : "Mantener pulsado para hablar con Onni"
                    }
                  >
                    {captureMicActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
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
