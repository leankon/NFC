"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerClientePorSlug } from "@/lib/data";
import { limpiarIntentos, permitirIntento } from "@/lib/ratelimit";
import { cerrarSesionLocal, iniciarSesionLocal } from "@/lib/session";
import { esSlugValido } from "@/lib/slug";

export type EstadoLogin = { ok: boolean; error?: string };

function ip(): string {
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocida"
  );
}

export async function loginLocal(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const slug = String(formData.get("slug") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!esSlugValido(slug)) return { ok: false, error: "Local no encontrado." };

  if (!permitirIntento(`local:${slug}:${ip()}`)) {
    return { ok: false, error: "Demasiados intentos. Esperá unos minutos." };
  }

  const cliente = await obtenerClientePorSlug(slug);

  // Mismo mensaje exista o no el local, para no filtrar qué slugs son válidos.
  if (!cliente || !password) {
    return { ok: false, error: "Contraseña incorrecta." };
  }

  const coincide = await bcrypt.compare(password, cliente.password_hash);
  if (!coincide) return { ok: false, error: "Contraseña incorrecta." };

  limpiarIntentos(`local:${slug}:${ip()}`);
  iniciarSesionLocal(slug);
  revalidatePath(`/dashboard/${slug}`);
  return { ok: true };
}

export async function logoutLocal(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").toLowerCase();
  if (esSlugValido(slug)) cerrarSesionLocal(slug);
  redirect(`/dashboard/${slug}`);
}
