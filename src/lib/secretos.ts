import "server-only";
import { randomBytes } from "crypto";

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
