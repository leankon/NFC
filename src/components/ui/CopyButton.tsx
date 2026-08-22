"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copiar",
}: {
  value: string;
  label?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      className="btn-secondary !px-3 !py-1.5 !text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        } catch {
          setCopiado(false);
        }
      }}
    >
      {copiado ? "¡Copiado!" : label}
    </button>
  );
}
