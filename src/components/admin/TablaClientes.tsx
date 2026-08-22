import { FilaCliente } from "@/components/admin/FilaCliente";
import type { ClienteConClicks } from "@/lib/types";

export function TablaClientes({
  clientes,
  baseUrl,
}: {
  clientes: ClienteConClicks[];
  baseUrl: string;
}) {
  if (clientes.length === 0) {
    return (
      <div className="card text-center">
        <p className="font-medium">Todavía no hay clientes</p>
        <p className="mt-1 text-sm text-muted">
          Creá el primero con el botón de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-semibold">Local</th>
            <th className="px-4 py-3 font-semibold">Destino</th>
            <th className="px-4 py-3 text-right font-semibold">Clicks</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => (
            <FilaCliente key={cliente.id} cliente={cliente} baseUrl={baseUrl} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
