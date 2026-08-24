import { AccesoLocal } from "@/components/home/AccesoLocal";

/**
 * La portada es solo para los locales. El panel de administración vive en
 * /admin y no se enlaza desde acá: lo usa una sola persona, que conoce la
 * dirección, y no hace falta anunciarle a nadie más que existe.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <div className="card">
        <h1 className="text-xl font-bold tracking-tight">
          Estadísticas de tu local
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Mirá cuántas veces escanearon tu tarjeta, a qué hora y qué días.
        </p>

        <div className="mt-6">
          <AccesoLocal />
        </div>
      </div>
    </main>
  );
}
