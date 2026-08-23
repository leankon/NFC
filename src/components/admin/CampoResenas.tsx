"use client";

import { useState } from "react";

/**
 * Casilla que le dice al servidor que el destino es un lugar de Google y hay
 * que convertirlo en link de reseñas. Viene tildada porque es el caso normal,
 * pero se puede destildar para guardar cualquier otra URL tal cual.
 */
export function CampoResenas({ porDefecto = true }: { porDefecto?: boolean }) {
  const [activo, setActivo] = useState(porDefecto);

  return (
    <label className="mt-2 flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name="resenas"
        checked={activo}
        onChange={(e) => setActivo(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-none cursor-pointer accent-brand"
      />
      <span className="text-slate-700">
        Es para pedir reseñas en Google
        <span className="mt-0.5 block text-xs text-muted">
          {activo
            ? "Pegá el link del local en Google Maps y lo convierto en el link que abre directo la ventana de reseñas."
            : "Se guarda la URL tal cual la pegues."}
        </span>
      </span>
    </label>
  );
}
