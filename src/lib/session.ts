import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const DURACION_MS = 1000 * 60 * 60 * 12; // 12 horas

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "Falta SESSION_SECRET (mínimo 16 caracteres) en las variables de entorno",
    );
  }
  return s;
}

function firmar(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function compararSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // Igual hacemos una comparación para no filtrar la longitud por tiempo.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

function crearToken(sujeto: string): string {
  const exp = Date.now() + DURACION_MS;
  const payload = `${sujeto}.${exp}`;
  return `${payload}.${firmar(payload)}`;
}

function tokenValido(token: string | undefined, sujeto: string): boolean {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 3) return false;
  const [suj, exp, sig] = partes;
  if (suj !== sujeto) return false;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return compararSeguro(sig, firmar(`${suj}.${exp}`));
}

const opcionesCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DURACION_MS / 1000,
};

// ----------------------------- Admin -----------------------------------

const ADMIN_COOKIE = "nfc_admin";

export function iniciarSesionAdmin(): void {
  cookies().set(ADMIN_COOKIE, crearToken("admin"), opcionesCookie);
}

export function cerrarSesionAdmin(): void {
  cookies().delete(ADMIN_COOKIE);
}

export function haySesionAdmin(): boolean {
  return tokenValido(cookies().get(ADMIN_COOKIE)?.value, "admin");
}

/** Compara contra la contraseña maestra de ADMIN_PASSWORD. */
export function passwordAdminCorrecta(intento: string): boolean {
  const esperada = process.env.ADMIN_PASSWORD;
  if (!esperada) {
    throw new Error("Falta ADMIN_PASSWORD en las variables de entorno");
  }
  return compararSeguro(intento, esperada);
}

// --------------------------- Local / slug -------------------------------

function cookieLocal(slug: string): string {
  return `nfc_local_${slug}`;
}

export function iniciarSesionLocal(slug: string): void {
  cookies().set(cookieLocal(slug), crearToken(slug), opcionesCookie);
}

export function cerrarSesionLocal(slug: string): void {
  cookies().delete(cookieLocal(slug));
}

export function haySesionLocal(slug: string): boolean {
  return tokenValido(cookies().get(cookieLocal(slug))?.value, slug);
}
