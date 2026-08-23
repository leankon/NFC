"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { crearCliente, type EstadoAccion } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Credenciales } from "@/components/admin/Credenciales";
import { CampoResenas } from "@/components/admin/CampoResenas";

const inicial: EstadoAccion = { ok: false };

export function NuevoCliente({ baseUrl }: { baseUrl: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, action] = useFormState(crearCliente, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok && estado.credenciales) formRef.current?.reset();
  }, [estado]);

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Nuevo cliente</h2>
          <p className="text-sm text-muted">
            Se genera el slug y una contraseña para su panel.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? "Cerrar" : "+ Crear cliente"}
        </button>
      </div>

      {abierto && (
        <form ref={formRef} action={action} className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label" htmlFor="nombre_local">
              Nombre del local
            </label>
            <input
              id="nombre_local"
              name="nombre_local"
              className="input"
              placeholder="Café Don José"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="redirect_url">
              Destino
            </label>
            <input
              id="redirect_url"
              name="redirect_url"
              className="input"
              placeholder="Pegá acá el link de Google Maps del local"
              required
            />
            <CampoResenas />
          </div>

          <div className="sm:col-span-1">
            <label className="label" htmlFor="slug">
              Slug <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              id="slug"
              name="slug"
              className="input"
              placeholder="cafe-don-jose"
              pattern="[a-zA-Z0-9\-]*"
            />
          </div>

          <div className="sm:col-span-3">
            <SubmitButton pendingText="Creando…">Crear cliente</SubmitButton>
          </div>
        </form>
      )}

      {estado.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      )}

      {estado.credenciales && (
        <Credenciales {...estado.credenciales} baseUrl={baseUrl} />
      )}
    </section>
  );
}
