/** Portal OnniVers Eventos — sitio onnivers.online (enlace externo desde la landing). */
export const ONNIVERS_ONLINE_URL = "https://onnivers.online/entrar";
export const ONNIVERS_ONLINE_HOME_URL = "https://onnivers.online/";

export function openOnniVersOnline(url: string = ONNIVERS_ONLINE_URL): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  window.open(trimmed, "_blank", "noopener,noreferrer");
  return true;
}
