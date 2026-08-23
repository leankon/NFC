/**
 * Helpers de slug y URL. Sin dependencias de Node: se pueden importar
 * tanto del servidor como de un componente cliente.
 */
/** Convierte "Café Don José" -> "cafe-don-jose" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

export function esSlugValido(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

/** Normaliza la URL de destino y valida que sea http(s). */
export function normalizarUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const conEsquema = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(conEsquema);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
