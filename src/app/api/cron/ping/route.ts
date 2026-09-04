import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * El plan gratuito de Supabase pausa los proyectos que pasan varios días sin
 * recibir consultas, y eso deja sin funcionar todas las tarjetas a la vez.
 * Esta ruta hace una consulta trivial para reiniciar ese contador; Vercel la
 * llama cada 4 días según lo declarado en vercel.json.
 *
 * No devuelve datos ni modifica nada: solo cuenta filas.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;

  if (secreto) {
    if (request.headers.get("authorization") !== `Bearer ${secreto}`) {
      return new NextResponse("No autorizado", { status: 401 });
    }
  } else {
    // Sin secreto la ruta queda abierta. Preferimos eso a que el ping falle en
    // silencio y el proyecto se pause igual, que es el problema que resuelve.
    console.warn(
      "[nfc] CRON_SECRET no está definida: la ruta de ping queda sin proteger",
    );
  }

  const { error } = await getSupabase()
    .from("clientes")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[nfc] el ping a Supabase falló:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
