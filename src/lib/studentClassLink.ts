/** Mismo enlace que «Copiar link alumno» en el panel docente. */
export function buildStudentClassUrl(slug: string): string {
  const normalized = slug.trim();
  if (!normalized) return "";
  if (typeof window !== "undefined") {
    return `${window.location.origin}/clase/${encodeURIComponent(normalized)}`;
  }
  return `/clase/${encodeURIComponent(normalized)}`;
}
