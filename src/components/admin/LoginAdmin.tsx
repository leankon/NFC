"use client";

import { useFormState } from "react-dom";
import { loginAdmin, type EstadoAccion } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inicial: EstadoAccion = { ok: false };

export function LoginAdmin() {
  const [estado, action] = useFormState(loginAdmin, inicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form action={action} className="card w-full max-w-sm">
        <h1 className="text-lg font-bold">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted">
          Ingresá la contraseña maestra para continuar.
        </p>

        <div className="mt-5">
          <label className="label" htmlFor="password">
            Contraseña maestra
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="input"
            required
            autoFocus
          />
        </div>

        {estado.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {estado.error}
          </p>
        )}

        <div className="mt-5">
          <SubmitButton className="btn-primary w-full" pendingText="Entrando…">
            Entrar
          </SubmitButton>
        </div>
      </form>
    </main>
  );
}
