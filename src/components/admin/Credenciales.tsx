"use client";

import { CopyButton } from "@/components/ui/CopyButton";

export function Credenciales({
  slug,
  nombre_local,
  password,
  baseUrl,
}: {
  slug: string;
  nombre_local: string;
  password: string;
  baseUrl: string;
}) {
  const linkNfc = `${baseUrl}/r/${slug}`;
  const linkPanel = `${baseUrl}/dashboard/${slug}`;
  const resumen = [
    `Local: ${nombre_local}`,
    `Link NFC: ${linkNfc}`,
    `Panel: ${linkPanel}`,
    `Contraseña: ${password}`,
  ].join("\n");

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-900">
        Credenciales de {nombre_local}
      </p>
      <p className="mt-1 text-xs text-emerald-800">
        Guardalas ahora: la contraseña no se puede volver a ver.
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        <Fila etiqueta="Link NFC" valor={linkNfc} />
        <Fila etiqueta="Panel del local" valor={linkPanel} />
        <Fila etiqueta="Contraseña" valor={password} mono />
      </dl>

      <div className="mt-3">
        <CopyButton value={resumen} label="Copiar todo" />
      </div>
    </div>
  );
}

function Fila({
  etiqueta,
  valor,
  mono,
}: {
  etiqueta: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className="text-emerald-900">{etiqueta}</dt>
      <dd className="flex items-center gap-2">
        <span
          className={`rounded bg-white px-2 py-1 text-xs ${mono ? "font-mono font-semibold" : ""}`}
        >
          {valor}
        </span>
        <CopyButton value={valor} />
      </dd>
    </div>
  );
}
