import { logoutAdmin } from "@/app/admin/actions";
import { LoginAdmin } from "@/components/admin/LoginAdmin";
import { NuevoCliente } from "@/components/admin/NuevoCliente";
import { TablaClientes } from "@/components/admin/TablaClientes";
import { baseUrl } from "@/lib/base-url";
import { listarClientesConClicks } from "@/lib/data";
import { haySesionAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!haySesionAdmin()) return <LoginAdmin />;

  const clientes = await listarClientesConClicks();
  const url = baseUrl();

  const activos = clientes.filter((c) => c.activo).length;
  const totalClicks = clientes.reduce((acc, c) => acc + c.total_clicks, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
          <p className="mt-1 text-sm text-muted">
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"} ·{" "}
            {activos} {activos === 1 ? "activo" : "activos"} ·{" "}
            {totalClicks.toLocaleString("es-AR")} clicks totales
          </p>
        </div>

        <form action={logoutAdmin}>
          <button type="submit" className="btn-secondary">
            Cerrar sesión
          </button>
        </form>
      </header>

      <div className="mt-8 space-y-6">
        <NuevoCliente baseUrl={url} />
        <TablaClientes clientes={clientes} baseUrl={url} />
      </div>
    </main>
  );
}
