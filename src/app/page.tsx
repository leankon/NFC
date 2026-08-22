import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">NFC Redirect</h1>
      <p className="mt-3 text-muted">
        Cada tarjeta NFC apunta a <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">/r/tu-slug</code>{" "}
        y desde ahí redirige al destino que configures. Todos los escaneos quedan
        registrados.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin" className="btn-primary">
          Panel de administración
        </Link>
      </div>

      <p className="mt-6 text-sm text-muted">
        ¿Tenés un local? Entrá a <code className="rounded bg-slate-200 px-1.5 py-0.5">/dashboard/tu-slug</code>{" "}
        con la contraseña que te dieron.
      </p>
    </main>
  );
}
