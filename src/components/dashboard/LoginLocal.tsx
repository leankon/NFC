"use client";

import { useFormState } from "react-dom";
import { loginLocal, type EstadoLogin } from "@/app/dashboard/[slug]/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inicial: EstadoLogin = { ok: false };

export function LoginLocal({ slug }: { slug: string }) {
  const [estado, action] = useFormState(loginLocal, inicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form action={action} className="card w-full max-w-sm">
        <h1 className="text-lg font-bold">Estadísticas de tu local</h1>
        <p className="mt-1 text-sm text-muted">
          Ingresá la contraseña que te dio tu proveedor.
        </p>

        <input type="hidden" name="slug" value={slug} />

        <div className="mt-5">
          <label className="label" htmlFor="password">
            Contraseña
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
            Ver mis estadísticas
          </SubmitButton>
        </div>
      </form>
    </main>
  );
}
