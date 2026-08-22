"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import {
  actualizarCliente,
  cambiarEstado,
  eliminarCliente,
  regenerarPassword,
  type EstadoAccion,
} from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Credenciales } from "@/components/admin/Credenciales";
import type { ClienteConClicks } from "@/lib/types";

const inicial: EstadoAccion = { ok: false };

export function FilaCliente({
  cliente,
  baseUrl,
}: {
  cliente: ClienteConClicks;
  baseUrl: string;
}) {
  const [editando, setEditando] = useState(false);
  const [estadoEdicion, accionEditar] = useFormState(actualizarCliente, inicial);
  const [estadoClave, accionClave] = useFormState(regenerarPassword, inicial);

  return (
    <>
      <tr className="border-t border-slate-200 align-middle">
        <td className="px-4 py-3">
          <div className="font-medium">{cliente.nombre_local}</div>
          <Link
            href={`/r/${cliente.slug}`}
            className="text-xs text-brand hover:underline"
            target="_blank"
          >
            /r/{cliente.slug}
          </Link>
        </td>

        <td className="max-w-[240px] px-4 py-3">
          <a
            href={cliente.redirect_url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm text-slate-600 hover:underline"
            title={cliente.redirect_url}
          >
            {cliente.redirect_url}
          </a>
        </td>

        <td className="px-4 py-3 text-right tabular-nums">
          <span className="font-semibold">{cliente.total_clicks.toLocaleString("es-AR")}</span>
        </td>

        <td className="px-4 py-3">
          <form action={cambiarEstado}>
            <input type="hidden" name="id" value={cliente.id} />
            <input type="hidden" name="activo" value={String(!cliente.activo)} />
            <button
              type="submit"
              className={`badge transition ${
                cliente.activo
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title={cliente.activo ? "Desactivar" : "Activar"}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  cliente.activo ? "bg-emerald-600" : "bg-slate-500"
                }`}
              />
              {cliente.activo ? "Activo" : "Inactivo"}
            </button>
          </form>
        </td>

        <td className="px-4 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 !text-xs"
              onClick={() => setEditando((v) => !v)}
            >
              {editando ? "Cerrar" : "Editar"}
            </button>

            <Link
              href={`/dashboard/${cliente.slug}`}
              target="_blank"
              className="btn-secondary !px-3 !py-1.5 !text-xs"
            >
              Panel
            </Link>

            <form action={accionClave}>
              <input type="hidden" name="id" value={cliente.id} />
              <SubmitButton
                className="btn-secondary !px-3 !py-1.5 !text-xs"
                pendingText="…"
              >
                Nueva clave
              </SubmitButton>
            </form>

            <form
              action={eliminarCliente}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `¿Eliminar "${cliente.nombre_local}"? Se borran también sus clicks.`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={cliente.id} />
              <button type="submit" className="btn-danger !px-3 !py-1.5 !text-xs">
                Eliminar
              </button>
            </form>
          </div>
        </td>
      </tr>

      {(editando || estadoEdicion.error || estadoClave.credenciales || estadoClave.error) && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={5} className="px-4 py-4">
            {editando && (
              <form action={accionEditar} className="grid gap-3 sm:grid-cols-4">
                <input type="hidden" name="id" value={cliente.id} />

                <div>
                  <label className="label">Nombre</label>
                  <input
                    name="nombre_local"
                    className="input"
                    defaultValue={cliente.nombre_local}
                    required
                  />
                </div>

                <div>
                  <label className="label">Slug</label>
                  <input
                    name="slug"
                    className="input"
                    defaultValue={cliente.slug}
                    pattern="[a-zA-Z0-9\-]+"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">URL de destino</label>
                  <input
                    name="redirect_url"
                    className="input"
                    defaultValue={cliente.redirect_url}
                    required
                  />
                </div>

                <div className="sm:col-span-4 flex items-center gap-3">
                  <SubmitButton className="btn-primary !py-2 !text-sm">
                    Guardar cambios
                  </SubmitButton>
                  {estadoEdicion.mensaje && (
                    <span className="text-sm text-emerald-700">
                      {estadoEdicion.mensaje}
                    </span>
                  )}
                </div>
              </form>
            )}

            {estadoEdicion.error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {estadoEdicion.error}
              </p>
            )}

            {estadoClave.error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {estadoClave.error}
              </p>
            )}

            {estadoClave.credenciales && (
              <Credenciales {...estadoClave.credenciales} baseUrl={baseUrl} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
