import { randomBytes } from "crypto";

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

/** Sufijo corto para desambiguar slugs repetidos. */
export function sufijoAleatorio(len = 4): string {
  const alfabeto = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alfabeto[bytes[i] % alfabeto.length];
  return out;
}

/** Contraseña legible para entregarle al local. */
export function generarPassword(len = 10): string {
  const alfabeto = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alfabeto[bytes[i] % alfabeto.length];
  return out;
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
