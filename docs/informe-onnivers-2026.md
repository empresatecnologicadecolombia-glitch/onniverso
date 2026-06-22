# Informe completo — OnniVers (abril–junio 2026)

**Empresa Tecnológica de Colombia**  
**Producción:** https://onnivers.com  
**Generado:** 17 de junio de 2026

---

## Resumen ejecutivo

**OnniVers** (antes *ViveVR*) es una plataforma de **realidad virtual, aumentada e inmersiva** para educación, eventos, comunidad, comercio y streaming en vivo. El proyecto arrancó el **27 de abril de 2026** y al **17 de junio de 2026** acumula **664 commits** en Git.

| Dato | Valor |
|------|-------|
| Primer commit | 27 abr 2026 — ViveVR app (Vite, React, PayPal, Supabase, Capacitor) |
| Producción web | onnivers.com (Vercel) |
| Código fuente src/ | ~338 archivos TS/TSX · ~38.000 líneas |
| Commits por mes | Abril: 19 · Mayo: 469 · Junio: 175+ |

Es un **monorepo** con una sola base React que se despliega en:

- **Web** (Chrome, móvil)
- **APK Android** (Capacitor + actividades nativas Java)
- **OnniVers PC** (.exe Electron que carga onnivers.com)

---

## Cronología del proyecto

### Abril 2026 — Nacimiento (ViveVR → OnniVers)

- **27 abr:** primer commit con Vite + React + TypeScript, Supabase, PayPal, Capacitor Android.
- **Mi Mundo VR:** perfil, videos, integración con variables de entorno.
- **Lobby 3D:** experiencia A-Frame inmersiva (luego refactorizada).
- **Mirror SBS / VR:** modo estéreo, pantalla completa, sincronización de video.
- Base de **navegación**, **auth** y **estructura Android** (MainActivity).

### Mayo 2026 — Crecimiento masivo (~469 commits)

Mes de mayor construcción. Hitos principales:

**Streaming y salas en vivo**

- Integración **Agora RTC** (emisor/espectador).
- EspectadorView, EmisorView, NuestrasSalasPage.
- **SelectorActivity** Android: VR / 360° / MT con URLs dinámicas.
- Puente **WebView ↔ JavaScript** (AndroidBridge, window.Android).
- **Mux** y **Livepeer** para HLS/streaming alternativo.
- Paywall de entradas, streams activos, solicitudes LIVE.

**Experiencias 3D / inmersivas**

- **Coliseo** (escena 360° con Three.js / React Three Fiber).
- Modelos GLB: corazón, dinosaurios, farol, anatomía, volcán, tierra/luna.
- **Lobby inmersivo** (LobbyImmersivePage, NeonRoom, controles móvil).
- **Aula virtual** con galería de paredes y temas.
- **Galería 3D**, podcast hub, teatro, lobby global.

**Producto y contenido**

- Landing **WorldCupVrHero** (Mundial 2026, pilares del ecosistema).
- Páginas: Educación, Eventos, Tienda, Comunidad, Red social inmersiva.
- SEO: LandingSeoContent, HomeOnniVersSeoSection, meta tags.
- **Onni** asistente con navegación por voz y conocimiento del sitio.

**Backend Supabase**

- Perfiles, avatares, roles.
- Eventos virtuales, compras, tickets.
- Chat, amistades, streams activos, tienda.
- Edge Functions: tokens Agora, Livepeer, Gemini, STT.

### Junio 2026 — Consolidación y producción (~175 commits)

**Aulas virtuales en vivo (baseline validado 31 may – 1 jun)**

- DocenteClasesPage: crear/editar clases, plantillas, sesiones.
- Sincronización docente → alumnos: video MP4/PDF/GLB en **Coliseo**.
- ClaseVirtualEntryPage para entrada de estudiantes.
- AgoraClassVoiceBridge: voz en clase, panel de conectados.
- ColiseoBrowserPanel: play/pausa/siguiente/anterior sincronizado.
- Playlist de videos persistente.
- Registro con rol (particular, estudiante, docente).

**OnniVers PC (.exe)**

- Electron empaquetado (OnniVers-Setup.exe).
- Mic **push-to-hold** con Azure STT.
- Tecla **Espacio** = mic (chat cerrado).
- Scroll solo con rueda del mouse.
- **Ollama** local (gemma3:1b) con fallback a **Gemini**.
- TTS por bridge Electron.
- Limpieza de ~611 MB de motores muertos (Whisper/WinSpeech).

**Recientes (11–17 jun)**

- Landing pública en `/`, Mi Mundo en `/inicio`.
- Memoria persistente de chat Onni (localStorage + historial Gemini).
- Flags de visibilidad UI (ocultar menús, precios, botones).
- Enlace **Caracol TV** en vivo (icono redes + botón Mundial 2026).
- Ocultar «Ir a Salas» y «Explorar» en tiendas inmersivas.
- Contacto visible en footer.

---

## Arquitectura técnica

### Clientes

- Navegador Chrome (web escritorio y móvil)
- APK Android (Capacitor)
- OnniVers PC (Electron .exe → carga onnivers.com)

### Frontend (React/Vite)

- App.tsx + 42 páginas
- OpAiAssistant (Onni)
- Coliseo (Three.js)
- Lobby (A-Frame/Three)
- Agora Live Streaming UI

### Backend

- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Edge Functions (Deno)
- Vercel API Routes (/api/)

### Servicios externos

- Agora RTC — streaming y voz en vivo
- Mux Video — HLS alternativo
- Livepeer — streaming
- PayPal — pagos
- Azure Speech — STT/TTS (.exe y APK)
- Google Gemini — chat IA en nube
- Ollama — IA local en .exe

### Flujo de datos

1. Clientes (Web, APK, .exe) cargan la misma app React.
2. La app se comunica con Supabase (auth, perfiles, aulas, chat, streams).
3. Edge Functions generan tokens Agora, procesan Gemini y STT.
4. APIs Vercel sirven Azure Speech y Mux.
5. Agora conecta emisores y espectadores en tiempo real.
6. El .exe además usa Ollama local y bridges Electron para voz.

---

## Librerías y dependencias

### Core frontend

| Librería | Uso |
|----------|-----|
| React 18 + React DOM | UI principal |
| TypeScript 5.8 | Tipado |
| Vite 8 | Build y dev server |
| React Router 6 | ~40 rutas |
| TanStack React Query | Cache y fetching |
| Tailwind CSS 3 + tailwindcss-animate | Estilos glass/futurista |
| shadcn/ui (Radix UI completo) | Componentes UI |
| Framer Motion 12 | Animaciones landing |
| Lucide React | Iconos |
| Zod + React Hook Form | Formularios y validación |
| date-fns | Fechas |
| Sonner | Toasts |
| Recharts | Gráficos |
| Embla Carousel | Carruseles |

### 3D / VR / inmersivo

| Librería | Uso |
|----------|-----|
| Three.js 0.183 | Motor 3D base |
| @react-three/fiber + @react-three/drei | Coliseo, modelos GLB |
| A-Frame + aframe-extras | Lobby inmersivo, escenas WebXR |

### Streaming y video

| Librería | Uso |
|----------|-----|
| agora-rtc-sdk-ng | Live emisor/audiencia y voz en clases |
| @mux/mux-player-react + @mux/mux-node | Reproductor y API Mux |
| @livepeer/react | Streaming alternativo HLS |
| hls.js | Reproducción HLS en navegador |

### Backend / datos

| Librería | Uso |
|----------|-----|
| @supabase/supabase-js | Auth, DB, Realtime, Storage |
| supabase CLI (dev) | Migraciones y Edge Functions |

### Pagos

| Librería | Uso |
|----------|-----|
| @paypal/react-paypal-js | Checkout eventos, tienda, cursos |

### Voz / IA (Onni)

| Librería | Uso |
|----------|-----|
| microsoft-cognitiveservices-speech-sdk | Azure STT/TTS (.exe y APK) |
| Gemini (Edge Function onni-gemini) | Chat IA en nube |
| Ollama (solo .exe, vía fetch local) | IA offline |

### Móvil y escritorio

| Librería | Uso |
|----------|-----|
| Capacitor 8 | APK Android |
| Electron 41 + electron-builder | OnniVers PC .exe |

### Utilidades

| Librería | Uso |
|----------|-----|
| browser-image-compression | Avatares |
| clsx + tailwind-merge + class-variance-authority | Clases CSS |
| cmdk | Command palette |
| vaul | Drawer móvil |
| input-otp | OTP auth |

### Dev / calidad

| Herramienta | Uso |
|-------------|-----|
| Vitest + Testing Library | 7 archivos de test |
| ESLint 9 + typescript-eslint | Lint |
| ffmpeg-static, sharp, png-to-ico, rcedit | Build desktop/iconos |

---

## Todo lo construido — por módulo

### 1. Autenticación y perfiles

- Registro/login (/entrar, /registro, /auth).
- OAuth (Google, etc.).
- Roles: particular, estudiante, docente, admin.
- Perfiles con avatar, app_role, datos LIVE.
- Rutas privadas (PrivateRoute) y guest (GuestRoute).
- Páginas legales: privacidad, términos, quiénes somos, contacto.

### 2. Landing y marketing (/)

- Hero OnniVerso con pilares: conciertos, red social, educación, tiendas.
- Tarjeta Accesibilidad Universal.
- Tarjeta Mundial 2026 → Caracol TV en vivo.
- SEO editorial (LandingSeoContent, HomeOnniVersSeoSection).
- Footer con correo y teléfono visibles.

### 3. Mi Mundo (/inicio)

- MiMundoVRSection: tarjeta de perfil, entornos VR, feed.
- Acceso a lobby, coliseo, salas, configuración LIVE.
- Fondo con cámara (web y APK con permisos nativos).

### 4. Streaming en vivo (Agora)

- Emisor (/sala/emisor).
- Espectador (/sala/espectador/:channel).
- Nuestras Salas / Videos educativos: catálogo de artistas/salas.
- Tokens vía Edge Function agora-token.
- En Android: PlayerActivity, SelectorActivity, VR/360/MT nativo.
- Conciertos LIVE: config (/conciertos-live/config) y emisión.

### 5. Coliseo — escena 360° principal (/coliseo)

- Panoramas 360° intercambiables (estadio, volcán, etc.).
- Modelos GLB flotantes (corazón, tierra/luna, dinosaurios…).
- Pantallas flotantes: video MP4, PDF, WebView/YouTube.
- ColiseoBrowserPanel: controles docente sincronizados.
- Guía de cámara 360° para docentes.
- Puente nativo Android (ColiceoActivity, AndroidBridge).

### 6. Aulas virtuales (educación en vivo)

- Docente (/docente-clases): CRUD de aulas, clases, plantillas.
- Catálogo docente: videos educativos, PDFs, modelos 3D (volcán, reptisect…).
- Estudiante (/clase/:slug): entrada con estado de sesión en vivo.
- Tablas Supabase: aulas_virtuales, clase_templates, clase_sesiones, clase_eventos.
- Sync Realtime: recursos, play/pausa, playlist de videos.
- Voz en clase: AgoraClassVoiceBridge + panel docente de conectados.

### 7. Educación (/educacion)

- Cursos, categorías, biblioteca de contenido.
- Integración con aulas y Coliseo.

### 8. Eventos y entradas (/eventos, /event/:id)

- Eventos virtuales (ej. conciertos).
- Compras con PayPal.
- Tickets y paywall (TicketPaywall).

### 9. Tienda inmersiva (/tienda)

- Productos digitales (lobbies, modelos 3D, experiencias).
- PayPal checkout.
- Catálogo con imágenes y descripciones.

### 10. Comunidad (/comunidad)

- Red social interna, amistades, chat.
- Tabla friendships, chat_messages.

### 11. Lobby inmersivo (/lobby-inmersivo)

- NeonRoom: escena 3D con cámara, gyro, controles táctiles.
- Pantallas con video (HLS/MP4).
- Decoraciones: tierra/luna, cerebro, corazón, dinosaurios, farol.
- En Android: LobbyVrActivity, deep links.

### 12. Aula virtual / Galería 3D

- /aula-virtual, /3d, /reproductor-galeria.
- Modelos GLB, elección de sala nativa vs web.

### 13. Podcast y teatro

- /podcast-hub, /podcast/:id.
- /teatro-hub, /teatro/:id.
- Streamers configurados en podcastStreamers.ts.

### 14. Onni — asistente IA

- OpAiAssistant: chat flotante global en toda la app.
- **Voz por plataforma:**
  - Chrome: Web Speech API, wake «Hola Onni».
  - Android APK: mic Azure (OpAiAndroidAzureMic).
  - .exe: mic push-to-hold Azure, Espacio, TTS bridge.
- **IA:** Gemini (nube) + Ollama (local .exe).
- **Memoria:** hasta 80 mensajes en localStorage, 12 turnos a Gemini.
- **Comandos:** navegación por voz (opAssistantResolver), conocimiento del sitio (opAssistantKnowledge).
- Fila de iconos sociales (HomeSocialRedesRow): YouTube, Facebook, Instagram, TikTok, Google, Caracol TV, WhatsApp.

### 15. Android nativo (Java)

| Actividad | Función |
|-----------|---------|
| MainActivity | WebView principal, bridges JS |
| SelectorActivity | Selector VR/360/MT |
| PlayerActivity | Reproductor estéreo |
| ColiceoActivity | Coliseo nativo |
| LobbyVrActivity | Lobby VR |
| AulaVirtualActivity | Aula virtual nativa |

### 16. OnniVers PC (Electron)

- Carga remota https://onnivers.com.
- Mic Azure streaming STT.
- Ollama local para respuestas rápidas.
- Scroll solo mouse, sin teclado.
- Instalador NSIS Windows x64.

### 17. APIs Vercel (/api/)

- azure/speech-token, speech-stt, speech-tts
- mux/create-stream, stream-status, webhook

### 18. Supabase Edge Functions

- agora-token — tokens RTC
- onni-gemini — chat IA con historial
- onni-stt — speech-to-text
- livepeer-stream — streams Livepeer

### 19. Base de datos (tablas principales)

| Tabla | Propósito |
|-------|-----------|
| profiles | Usuarios, roles, avatar, LIVE |
| events / tickets | Eventos y entradas |
| eventos_virtuales / compras | Eventos virtuales y compras |
| active_streams | Streams en curso |
| live_requests | Solicitudes LIVE |
| store_items | Tienda |
| friendships | Amistades |
| chat_messages | Chat |
| aulas_virtuales | Aulas docente |
| aula_miembros | Miembros de aula |
| clase_templates | Plantillas de clase |
| clase_sesiones | Sesiones en vivo con state_snapshot |
| clase_eventos | Eventos de sincronización |

---

## Rutas principales de la aplicación

| Ruta | Descripción | Auth |
|------|-------------|------|
| / | Landing pública | No |
| /inicio | Mi Mundo (perfil VR) | Sí |
| /entrar | Bienvenida / login | Guest |
| /registro | Registro con rol | Guest |
| /educacion | Educación inmersiva | Sí |
| /eventos | Eventos | No |
| /red-social-inmersiva | Red social inmersiva | No |
| /tienda | Tienda inmersiva | Sí |
| /comunidad | Comunidad | Sí |
| /nuestras-salas | Videos educativos / salas | Sí |
| /coliseo | Escena 360° Coliseo | Sí |
| /docente-clases | Panel docente | Sí |
| /clase/:slug | Entrada estudiante a clase | Sí |
| /lobby-inmersivo | Lobby 3D | Sí |
| /aula-virtual | Aula virtual | Sí |
| /3d | Galería 3D | Sí |
| /sala/emisor | Emisión Agora | Sí |
| /sala/espectador/:channel | Audiencia Agora | Sí |
| /conciertos-live/config | Config stream LIVE | Sí |
| /conciertos-live/emitir | Emitir concierto | Sí |
| /pc | Escena PC LIVE | Sí |
| /quienes-somos | Quiénes somos | No |
| /contacto | Contacto | No |
| /privacidad | Privacidad | No |
| /terminos | Términos | No |

---

## Estado actual (17 jun 2026)

### UI oculta (flags en navVisibility.ts)

- Menú **Videos educativos** y **Tienda**
- **Precios** en educación, tienda, eventos, comunidad, planes
- Botón **LIVE** y **Configurar Live** en Mi Mundo
- **Tabla de contenido** en panel docente
- Botón **«Ir a Salas»** en red social inmersiva
- Botón **«Explorar»** en tarjeta Tiendas inmersivas

*(Las rutas y la lógica siguen activas; solo se oculta la UI.)*

### Puntos de restauración Git validados

| Etiqueta | Qué protege |
|----------|-------------|
| restauracion-principal-2026-05-11 | Estado general funcionando |
| restauracion-aulas-live-2026-05-31 | Aulas en vivo + sync Coliseo |
| onni-exe-validado-2026-06-01 | OnniVers PC (.exe) |

### Áreas congeladas (reglas del proyecto)

- Flujo Agora (tokens, join, audiencia, tracks)
- Puente AndroidBridge / window.Android / SelectorActivity
- Voz/mic Onni por plataforma (Chrome ≠ .exe ≠ APK)
- OnniVers PC (.exe): mic, Espacio, scroll, Ollama/Gemini
- Baseline aulas en vivo Coliseo (sync video, playlist, voz)

### Tests automatizados

- Voz Onni (onniVoice.test.ts)
- Micrófono (requestOnniMicrophone.test.ts)
- Resolver de comandos (opAssistantResolver.test.ts)
- Layout videos educativos (videosEducativosLayout.test.ts)
- Baseline voz Coliseo (coliseoClassVoiceBaseline.test.ts)
- Guía docente (coliseoDocenteGuide.test.ts)

---

## Activos y contenido

- **59+ archivos** en public/: imágenes de pilares, modelos GLB, texturas tierra/luna, panoramas, favicons.
- Catálogo docente: videos, PDFs tecnología, modelos 3D (volcán, reptisect, corazón, anatomía…).
- Streamers/salas: podcast, videos educativos, eventos.

### Modelos 3D destacados

- corazon.glb, dino-trex.glb, dino-diplo.glb, dino-generic.glb
- farol-lantern.glb
- modello 3d anatomia umana.glb

### Imágenes de pilares (landing)

- educacion-inmersiva.jpeg
- eventos-inmersivos.jpeg
- compras-inmersivas.jpeg
- red-social-inmersiva.jpeg
- accesibilidad-universal.jpeg
- onni-ecosystem-metaverse.png

---

## Scripts npm principales

| Script | Función |
|--------|---------|
| npm run dev | Servidor desarrollo Vite |
| npm run build | Build producción |
| npm run sync:android | Build + cap sync Android |
| npm run desktop:dev | Electron desarrollo |
| npm run desktop:build | Generar OnniVers-Setup.exe |
| npm run test | Vitest |
| npm run lint | ESLint |

---

## Conclusión

En **~7 semanas** y **664 commits**, OnniVers pasó de un prototipo **ViveVR** a una plataforma inmersiva multiplataforma con:

- Streaming **Agora** en vivo
- **Aulas virtuales** en Coliseo con sync docente-alumno
- Asistente **Onni** con IA (Gemini + Ollama) y voz multiplataforma
- **Tienda y eventos** con PayPal
- **APK Android** nativo con VR/360/AR
- **App de escritorio Windows** (.exe)
- Despliegue en producción en **onnivers.com** con **Supabase** + **Vercel**

---

*Documento generado automáticamente desde el repositorio OnniVers.*  
*Empresa Tecnológica de Colombia — OnniVers © 2026*
