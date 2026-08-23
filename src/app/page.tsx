import Link from "next/link";
import { AccesoLocal } from "@/components/home/AccesoLocal";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">¿Cómo querés entrar?</h1>
        <p className="mt-2 text-muted">Elegí la opción que te corresponda.</p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {/* --- Local --- */}
        <section className="card flex flex-col">
          <span className="badge w-fit bg-blue-100 text-brand">Tengo un local</span>
          <h2 className="mt-3 text-lg font-semibold">Mis estadísticas</h2>
          <p className="mt-1 text-sm text-muted">
            Mirá cuántas veces te escanearon, a qué hora y qué días.
          </p>

          <div className="mt-5">
            <AccesoLocal />
          </div>
        </section>

        {/* --- Admin --- */}
        <section className="card flex flex-col">
          <span className="badge w-fit bg-slate-200 text-slate-700">
            Soy el administrador
          </span>
          <h2 className="mt-3 text-lg font-semibold">Panel de control</h2>
          <p className="mt-1 text-sm text-muted">
            Dar de alta locales, cambiar destinos, activar o suspender el servicio.
          </p>

          <div className="mt-auto pt-5">
            <Link href="/admin" className="btn-secondary w-full">
              Entrar al panel
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
