# Informe Completo — OnniVers / OnniVerso

**Documento técnico del proyecto**  
**Producción:** https://onnivers.com  
**Repositorio:** https://github.com/empresatecnologicadecolombia-glitch/onniverso.git  
**Fecha:** Junio 2026  
**Autor del informe:** Generado desde el codebase del proyecto

---

## 1. Qué es la aplicación

**OnniVers** es una plataforma educativa y de entretenimiento inmersivo que combina tres capas de distribución:

| Capa | Descripción |
|------|-------------|
| **Web (Vercel)** | App React principal: salas 360°, clases virtuales, streaming, tienda, comunidad, Onni (asistente IA) |
| **APK Android (Capacitor)** | Misma web empaquetada + actividades nativas VR (lobby, Coliseo, reproductor HLS, Agora nativo) |
| **EXE Windows (Electron)** | Ventana de escritorio que carga onnivers.com + voz Onni con Azure STT |

**Rama principal:** `main` → despliegue automático en Vercel.

---

## 2. Stack tecnológico

### 2.1 Núcleo frontend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.3 | UI principal |
| TypeScript | 5.8 | Tipado |
| Vite | 8.0 | Build y dev server |
| React Router | 6.30 | Navegación SPA |
| TanStack Query | 5.83 | Cache y fetch de datos |
| Tailwind CSS | 3.4 | Estilos |
| shadcn/ui + Radix UI | varios | Componentes UI |
| Framer Motion | 12.38 | Animaciones |
| Zod + React Hook Form | — | Formularios y validación |

### 2.2 Gráficos 3D / VR

| Librería | Uso |
|----------|-----|
| Three.js 0.183 | Motor 3D |
| @react-three/fiber | React + Three |
| @react-three/drei | Controles, Html, loaders |
| A-Frame + aframe-extras | Escenas VR (lobby, aulas) |

### 2.3 Streaming y medios

| Librería | Uso |
|----------|-----|
| agora-rtc-sdk-ng 4.24 | Voz/video en vivo (clases, salas) |
| @mux/mux-player-react + @mux/mux-node | Emisión y reproducción Mux |
| @livepeer/react | Emisión alternativa Livepeer |
| hls.js | Reproducción HLS en web |
| browser-image-compression | Compresión de imágenes |

### 2.4 Backend, móvil y escritorio

| Librería | Uso |
|----------|-----|
| @supabase/supabase-js 2.103 | Auth, DB, Realtime, Storage |
| @paypal/react-paypal-js | Pagos |
| @capacitor/core + android 8.3 | APK Android |
| Electron 41.3 + electron-builder 26 | EXE Windows |

---

## 3. Módulos y rutas principales

### 3.1 Autenticación

| Ruta | Función |
|------|---------|
| /entrar | Login |
| /registro | Registro (particular, estudiante, docente) |
| /auth | Callback OAuth Supabase |
| /actualizar-contrasena | Reset contraseña |

### 3.2 Educación y clases

| Ruta | Función |
|------|---------|
| /educacion | Hub educativo |
| /docente-clases | Panel docente |
| /clase/:slug | Entrada estudiante |
| /coliseo?class=... | Coliseo 360° (video, GLB, PDF, voz, guía cámara) |
| /aula-virtual | Aula virtual estéreo |

### 3.3 Entretenimiento inmersivo

| Ruta | Función |
|------|---------|
| /lobby-inmersivo | Lobby VR 360° |
| /3d | Galería 3D |
| /podcast-hub, /podcast/:id | Podcasts |
| /teatro-hub, /teatro/:id | Teatro virtual |
| /eventos, /event/:id | Eventos con tickets |

### 3.4 Streaming en vivo

| Ruta | Función |
|------|---------|
| /nuestras-salas | Videos educativos |
| /live-stream | Stream en vivo |
| /sala/emisor, /sala/espectador/:channel | Emisor y espectador |
| /conciertos-live/config, /emitir | Conciertos Live (Mux) |

### 3.5 Social y tienda

| Ruta | Función |
|------|---------|
| /comunidad | Amigos, streams activos |
| /tienda | Biblioteca / cursos |

### 3.6 Onni (asistente global)

Montado en todas las páginas vía `OpAiAssistant`:
- Chat texto + voz
- Navegación por comandos
- Respuestas con Google Gemini
- Control de clases docente por voz

---

## 4. Base de datos Supabase

**Proyecto:** rwyhakcsvdbsavignogh  
**URL:** https://rwyhakcsvdbsavignogh.supabase.co  
**Cliente:** src/integrations/supabase/client.ts

### 4.1 Tablas (15)

| Tabla | Propósito |
|-------|-----------|
| profiles | Perfil, avatar, rol, estado live |
| events | Catálogo de eventos con tickets |
| tickets | Compras de tickets |
| eventos_virtuales | Eventos VR (seed) |
| compras | Compras eventos virtuales |
| active_streams | Streams activos por usuario |
| live_requests | Solicitudes para emitir |
| friendships | Amistades |
| chat_messages | Mensajes directos |
| store_items | Items de tienda |
| aulas_virtuales | Aulas virtuales |
| aula_miembros | Miembros de aula |
| clase_templates | Contenido: mp4, pdf, glb |
| clase_sesiones | Sesiones en vivo |
| clase_eventos | Eventos de sincronización |

### 4.2 Storage (buckets)

| Bucket | Uso |
|--------|-----|
| avatars | Fotos de perfil |
| live-event-images | Imágenes de eventos |
| store-assets | Portadas y archivos tienda |

### 4.3 Realtime (canales broadcast)

| Canal / evento | Uso |
|----------------|-----|
| class-video-sync-{slug} / video-control | Sync video Coliseo |
| class-camera-guide-{slug} / camera-guide | Guía cámara docente (botones 1-2-3) |
| voice-control | Permisos de hablar en clase Agora |
| chat_messages | Chat en tiempo real |

### 4.4 Edge Functions (4)

| Función | Secreto | Función |
|---------|---------|---------|
| onni-gemini | GEMINI_API_KEY | Chat Onni con Gemini |
| onni-stt | GEMINI_API_KEY | Speech-to-text |
| agora-token | AGORA_APP_ID, AGORA_APP_CERTIFICATE | Tokens RTC Agora |
| livepeer-stream | LIVEPEER_API_KEY | Crear stream Livepeer |

### 4.5 Migraciones

26 archivos SQL en supabase/migrations/.

**Nota:** types.ts está desactualizado respecto al esquema real.

---

## 5. Servicios externos

| Servicio | Para qué |
|----------|----------|
| Supabase | Auth, DB, Realtime, Storage, Edge Functions |
| Vercel | Hosting web + API routes |
| Google Gemini | Inteligencia Onni |
| Azure Speech | STT/TTS Onni (EXE y APK) |
| Mux | Streaming principal HLS |
| Agora | Voz en clases y salas live |
| Livepeer | Emisión alternativa |
| PayPal | Pagos |
| n8n | Webhook post-pago |
| Cloudinary | Videos, GLB, imágenes CDN |
| Google Drive | PDFs, GLB, descarga APK |

### Variables de entorno principales

| Variable | Dónde |
|----------|-------|
| VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY | Cliente |
| VITE_SITE_URL | Auth redirects |
| VITE_PAYPAL_CLIENT_ID | PayPal |
| NEXT_PUBLIC_AGORA_APP_ID | Cliente Agora |
| MUX_TOKEN_ID/SECRET | Vercel servidor |
| AZURE_SPEECH_KEY/REGION | Vercel servidor |
| GEMINI_API_KEY, AGORA_*, LIVEPEER_API_KEY | Supabase secrets |
| ONNIVERS_URL | Electron |

---

## 6. OnniVers.exe (Windows)

| Dato | Valor |
|------|-------|
| App ID | com.onnivers.desktop |
| Nombre | OnniVers |
| Main | electron/main.cjs |
| URL de carga | https://onnivers.com |
| Salida build | release/ |

### Artefactos

- OnniVers-Setup-1.0.0.exe — Instalador NSIS
- OnniVers-1.0.0.exe — Portable

### Scripts npm

- desktop:icon — genera icon.ico
- desktop:speech-build — compila onni-win-speech.exe
- desktop:whisper-build — empaqueta Whisper STT
- desktop:dev — desarrollo local
- desktop:build — pipeline completo

### Voz en .exe

| Componente | Comportamiento |
|------------|----------------|
| STT | Azure Speech, push-to-hold + Espacio |
| TTS | Web Speech API |
| Scroll | Solo rueda del mouse |

---

## 7. APK Android (ViveVR)

| Dato | Valor |
|------|-------|
| App ID | com.vivevr.app |
| Nombre | ViveVR |
| webDir | dist |
| Versión | 1.0.6 (versionCode 6) |
| SDK | min 24, target 36 |

### Comportamiento al abrir

1. Con internet: carga https://onnivers.com
2. Sin internet: usa bundle local dist/

### Actividades nativas

| Activity | Función |
|----------|---------|
| MainActivity | WebView Capacitor + bridges |
| SelectorActivity | Selector VR |
| PlayerActivity | ExoPlayer HLS |
| AulaVirtualActivity | Aula estéreo |
| LobbyVrActivity | Lobby inmersivo |
| ColiceoActivity | Coliseo nativo |

### Puentes JavaScript

| Objeto | Funciones clave |
|--------|-----------------|
| window.AndroidBridge | openStreamDirect, openLobby, openColiceo, voz Onni |
| window.Android | onArClick, WebViews, Agora nativo |
| window.AndroidScene | Selector espectador |
| window.AndroidMusic | Música lobby |

### Deep links

- onniverso://open?url=... — Abre URL interna
- onniver://open-lobby — Abre /lobby-inmersivo

### Voz Onni en APK

| Modo | STT | TTS |
|------|-----|-----|
| Principal | Azure Speech | Azure TTS para Gemini |
| Fallback | SpeechRecognizer Java | TextToSpeech Java |

---

## 8. Conexión APK ↔ Web ↔ Onni

La APK no es una app separada: es el mismo React con extensiones nativas para VR, reproducción y voz.

**Flujo típico:**
1. Usuario abre APK → WebView carga onnivers.com
2. Onni usa AndroidBridge para micrófono y TTS nativo
3. Salas/Coliseo pueden abrir actividades nativas VR
4. Streams HLS van a PlayerActivity (ExoPlayer)
5. Clases Agora pueden abrir Cine/Cam nativo fullscreen

---

## 9. Onni — asistente IA

### Capas de respuesta

1. Reglas locales (opAssistantResolver.ts)
2. Base de conocimiento (onniBrain.ts, opAssistantKnowledge.ts)
3. Google Gemini (Edge Function onni-gemini)

### Voz por plataforma

| Plataforma | Micrófono | Voz |
|------------|-----------|-----|
| Chrome web | Web Speech API + «Hola Onni» | Web Speech |
| EXE Windows | Azure STT hold/Espacio | Web Speech |
| APK Android | Azure STT toggle | Azure TTS |

---

## 10. Coliseo y clases virtuales

### Flujo

1. Docente crea aula en /docente-clases
2. Estudiantes entran por /clase/:slug
3. Ambos van al Coliseo con ?class=slug&video=...&pdf=...&glb=...

### Sincronización en Coliseo

| Función | Mecanismo |
|---------|-----------|
| Video play/pausa | Realtime class-video-sync |
| Voz de clase | Agora RTC |
| Guía cámara 360° | Realtime class-camera-guide (botones 1-2-3) |
| Contenido | Query params desde clase_templates |

---

## 11. Estructura de carpetas

```
pagina web onniverso/
├── src/                    # Código React
│   ├── pages/              # Páginas por ruta
│   ├── components/         # UI, 3D, streaming, Onni
│   ├── lib/                # Lógica de negocio
│   ├── hooks/              # Hooks React
│   ├── data/               # Catálogos, URLs
│   └── integrations/supabase/
├── public/                   # Assets estáticos
├── dist/                     # Build web
├── android/                  # Proyecto APK
├── electron/                 # EXE desktop
├── supabase/                 # Migraciones + Edge Functions
├── api/                      # Rutas Vercel
├── mux-api/                  # Servidor Mux local
├── scripts/                  # Build y sync
└── release/                  # EXE generados
```

---

## 12. Despliegue

| Destino | Cómo |
|---------|------|
| Web producción | Push a main → Vercel → onnivers.com |
| APK | npm run build + sync:android → Android Studio → Drive |
| EXE | npm run desktop:build → release/ |
| Supabase | supabase db push + functions deploy |

---

## 13. Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué es? | Plataforma web + APK + EXE de educación/entretenimiento inmersivo |
| ¿Dónde vive el código UI? | src/ → Vite → dist/ → Vercel y Capacitor |
| ¿Base de datos? | Supabase Postgres, 15 tablas, 4 Edge Functions |
| ¿Onni? | Asistente global con reglas + Gemini + voz por plataforma |
| ¿APK vs web? | Misma app; APK añade VR nativo y bridges Java |
| ¿EXE? | Electron que carga onnivers.com + Azure STT |
| ¿Clases? | Aulas Supabase + Coliseo 360° + Agora + sync |
| ¿Streaming? | Mux (principal), Agora (salas), Livepeer (alternativo) |
| ¿Pagos? | PayPal + webhook n8n |
| ¿Medios? | Cloudinary, Google Drive, Mux HLS |

---

*Empresa Tecnológica de Colombia — OnniVers*
