"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { getSupabase } from "@/lib/supabase";
import {
  cerrarSesionAdmin,
  haySesionAdmin,
  iniciarSesionAdmin,
  passwordAdminCorrecta,
} from "@/lib/session";
import { limpiarIntentos, permitirIntento } from "@/lib/ratelimit";
import { esSlugValido, normalizarUrl, slugify } from "@/lib/slug";
import { generarPassword, sufijoAleatorio } from "@/lib/secretos";
import { aLinkDeResena } from "@/lib/google";

export type EstadoAccion = {
  ok: boolean;
  error?: string;
  mensaje?: string;
  credenciales?: { slug: string; nombre_local: string; password: string };
};

const OK: EstadoAccion = { ok: true };

function ip(): string {
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocida"
  );
}

function exigirAdmin() {
  if (!haySesionAdmin()) redirect("/admin");
}

/**
 * El destino puede venir escrito de varias formas. Si el admin pidió
 * "link de reseñas" y pegó un lugar de Google, lo convertimos; si no,
 * tomamos la URL tal cual.
 */
async function resolverDestino(
  crudo: string,
  comoResena: boolean,
): Promise<{ url: string } | { error: string }> {
  const texto = crudo.trim();
  if (!texto) return { error: "Falta la URL de destino." };

  if (comoResena) {
    const resena = await aLinkDeResena(texto);
    if (resena) return { url: resena };

    // Si pidió reseñas pero no reconocimos el lugar, mejor avisar que
    // guardar en silencio un link que no hace lo que espera.
    return {
      error:
        "No pude reconocer el lugar de Google. Pegá el link largo de Maps " +
        "(el de la barra de direcciones) o el Place ID, o destildá la opción " +
        "de reseñas para guardar la URL tal cual.",
    };
  }

  const url = normalizarUrl(texto);
  if (!url) return { error: "La URL de destino no es válida." };
  return { url };
}

// ------------------------------- Login ---------------------------------

export async function loginAdmin(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const password = String(formData.get("password") ?? "");

  if (!permitirIntento(`admin:${ip()}`)) {
    return { ok: false, error: "Demasiados intentos. Esperá unos minutos." };
  }

  if (!password || !passwordAdminCorrecta(password)) {
    return { ok: false, error: "Contraseña incorrecta." };
  }

  limpiarIntentos(`admin:${ip()}`);
  iniciarSesionAdmin();
  revalidatePath("/admin");
  return OK;
}

export async function logoutAdmin(): Promise<void> {
  cerrarSesionAdmin();
  redirect("/admin");
}

// ----------------------------- Clientes ---------------------------------

async function slugDisponible(base: string): Promise<string> {
  const supabase = getSupabase();
  let candidato = base;

  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id")
      .eq("slug", candidato)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return candidato;
    candidato = `${base}-${sufijoAleatorio()}`;
  }

  throw new Error("No se pudo generar un slug único");
}

export async function crearCliente(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  exigirAdmin();

  const nombre = String(formData.get("nombre_local") ?? "").trim();
  const slugPedido = String(formData.get("slug") ?? "").trim().toLowerCase();
  const urlCruda = String(formData.get("redirect_url") ?? "");

  if (nombre.length < 2) {
    return { ok: false, error: "El nombre del local es obligatorio." };
  }

  const destino = await resolverDestino(urlCruda, formData.get("resenas") === "on");
  if ("error" in destino) return { ok: false, error: destino.error };
  const url = destino.url;

  const base = slugPedido ? slugify(slugPedido) : slugify(nombre);
  if (!base || !esSlugValido(base)) {
    return {
      ok: false,
      error: "El slug solo puede tener letras, números y guiones.",
    };
  }

  const slug = slugPedido ? base : await slugDisponible(base);

  if (slugPedido) {
    const { data: existente, error: errBusca } = await getSupabase()
      .from("clientes")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (errBusca) return { ok: false, error: errBusca.message };
    if (existente) return { ok: false, error: `El slug "${slug}" ya está en uso.` };
  }

  const password = generarPassword();
  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await getSupabase().from("clientes").insert({
    slug,
    nombre_local: nombre,
    redirect_url: url,
    activo: true,
    password_hash,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return {
    ok: true,
    mensaje: "Cliente creado.",
    credenciales: { slug, nombre_local: nombre, password },
  };
}

export async function actualizarCliente(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  exigirAdmin();

  const id = String(formData.get("id") ?? "");
  const slug = slugify(String(formData.get("slug") ?? ""));
  const nombre = String(formData.get("nombre_local") ?? "").trim();

  if (!id) return { ok: false, error: "Falta el cliente." };
  if (!esSlugValido(slug)) {
    return { ok: false, error: "Slug inválido (letras, números y guiones)." };
  }
  if (nombre.length < 2) return { ok: false, error: "El nombre es obligatorio." };

  const destino = await resolverDestino(
    String(formData.get("redirect_url") ?? ""),
    formData.get("resenas") === "on",
  );
  if ("error" in destino) return { ok: false, error: destino.error };
  const url = destino.url;

  const { data: choque, error: errBusca } = await getSupabase()
    .from("clientes")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (errBusca) return { ok: false, error: errBusca.message };
  if (choque) return { ok: false, error: `El slug "${slug}" ya está en uso.` };

  const { error } = await getSupabase()
    .from("clientes")
    .update({ slug, redirect_url: url, nombre_local: nombre })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function cambiarEstado(formData: FormData): Promise<void> {
  exigirAdmin();

  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "") === "true";
  if (!id) return;

  const { error } = await getSupabase()
    .from("clientes")
    .update({ activo })
    .eq("id", id);

  if (error) console.error("[nfc] cambiarEstado:", error.message);
  revalidatePath("/admin");
}

export async function regenerarPassword(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  exigirAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta el cliente." };

  const { data: cliente, error: errBusca } = await getSupabase()
    .from("clientes")
    .select("slug, nombre_local")
    .eq("id", id)
    .maybeSingle();

  if (errBusca) return { ok: false, error: errBusca.message };
  if (!cliente) return { ok: false, error: "Cliente no encontrado." };

  const password = generarPassword();
  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await getSupabase()
    .from("clientes")
    .update({ password_hash })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return {
    ok: true,
    mensaje: "Contraseña regenerada.",
    credenciales: {
      slug: cliente.slug as string,
      nombre_local: cliente.nombre_local as string,
      password,
    },
  };
}

export async function eliminarCliente(formData: FormData): Promise<void> {
  exigirAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await getSupabase().from("clientes").delete().eq("id", id);
  if (error) console.error("[nfc] eliminarCliente:", error.message);

  revalidatePath("/admin");
}
