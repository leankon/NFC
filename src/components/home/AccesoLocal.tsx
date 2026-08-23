"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { slugify } from "@/lib/slug";

/**
 * Deja que el dueño de un local llegue a su panel sin conocer la URL:
 * escribe el nombre de su local y lo mandamos a /dashboard/<slug>.
 */
export function AccesoLocal() {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(valor);

    if (!slug) {
      setError("Escribí el nombre de tu local.");
      return;
    }

    setError(null);
    router.push(`/dashboard/${slug}`);
  }

  return (
    <form onSubmit={entrar}>
      <label className="label" htmlFor="local">
        Nombre de tu local
      </label>
      <input
        id="local"
        name="local"
        className="input"
        placeholder="Café Don José"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        autoComplete="off"
      />

      {error ? (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Después te va a pedir la contraseña que te dieron.
        </p>
      )}

      <button type="submit" className="btn-primary mt-4 w-full">
        Ver mis estadísticas
      </button>
    </form>
  );
}
