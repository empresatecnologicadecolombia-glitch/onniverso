/**
 * Emisión en vivo por usuarios (Mux/OBS, Conciertos Live, /pc, emisor).
 * false = nadie puede publicar tarjetas live ni transmitir (incl. modo prueba).
 */
export const USER_LIVE_STREAMING_ENABLED = false;

export function isUserLiveStreamingEnabled(): boolean {
  return USER_LIVE_STREAMING_ENABLED;
}
