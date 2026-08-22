import { notFound, redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { horaYDia } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = { params: { slug: string } };

/**
 * No dejamos que un insert lento retrase la redirección: si la escritura
 * tarda más de lo razonable, redirigimos igual.
 */
const TIMEOUT_REGISTRO_MS = 1500;

async function registrarClick(clienteId: string) {
  const { hora, dia_semana } = horaYDia();
  const insert = getSupabase()
    .from("clicks")
    .insert({ cliente_id: clienteId, hora, dia_semana });

  await Promise.race([
    insert.then(({ error }) => {
      if (error) console.error("[nfc] no se pudo registrar el click:", error.message);
    }),
    new Promise((resolve) => setTimeout(resolve, TIMEOUT_REGISTRO_MS)),
  ]);
}

export default async function RedirectPage({ params }: Props) {
  const slug = params.slug.toLowerCase();

  const { data: cliente, error } = await getSupabase()
    .from("clientes")
    .select("id, nombre_local, redirect_url, activo")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[nfc] error consultando el cliente:", error.message);
    return <PantallaError />;
  }

  if (!cliente) notFound();

  if (!cliente.activo) return <PantallaSuspendida />;

  await registrarClick(cliente.id);

  redirect(cliente.redirect_url);
}

function PantallaSuspendida() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏸
        </div>
        <h1 className="mt-5 text-xl font-bold text-ink">Servicio suspendido</h1>
        <p className="mt-2 text-sm text-muted">contactá a tu proveedor</p>
      </div>
    </main>
  );
}

function PantallaError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-ink">No pudimos redirigirte</h1>
        <p className="mt-2 text-sm text-muted">Probá de nuevo en unos segundos.</p>
      </div>
    </main>
  );
}
