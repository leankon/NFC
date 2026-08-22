import Link from "next/link";
import { notFound } from "next/navigation";
import { logoutLocal } from "@/app/dashboard/[slug]/actions";
import { GraficoPorDia, GraficoPorHora } from "@/components/dashboard/Graficos";
import { LoginLocal } from "@/components/dashboard/LoginLocal";
import {
  ETIQUETAS_PERIODO,
  esPeriodo,
  estadisticas,
  obtenerClientePorSlug,
  type Periodo,
} from "@/lib/data";
import { haySesionLocal } from "@/lib/session";
import { esSlugValido } from "@/lib/slug";
import {
  APP_TIMEZONE,
  NOMBRES_DIAS,
  NOMBRES_DIAS_CORTOS,
  formatHora,
} from "@/lib/time";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
  searchParams: { periodo?: string };
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const slug = params.slug.toLowerCase();
  if (!esSlugValido(slug)) notFound();

  if (!haySesionLocal(slug)) return <LoginLocal slug={slug} />;

  const cliente = await obtenerClientePorSlug(slug);
  if (!cliente) notFound();

  const periodo: Periodo = esPeriodo(searchParams.periodo)
    ? searchParams.periodo
    : "mes";

  const stats = await estadisticas(cliente.id, periodo);

  const datosHora = stats.porHora.map((p) => ({
    etiqueta: String(p.hora).padStart(2, "0"),
    etiquetaLarga: `${formatHora(p.hora)} – ${formatHora((p.hora + 1) % 24)}`,
    clicks: p.clicks,
  }));

  const datosDia = stats.porDia.map((p) => ({
    etiqueta: NOMBRES_DIAS_CORTOS[p.dia],
    etiquetaLarga: NOMBRES_DIAS[p.dia],
    clicks: p.clicks,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {cliente.nombre_local}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`badge ${
                cliente.activo
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  cliente.activo ? "bg-emerald-600" : "bg-amber-600"
                }`}
              />
              {cliente.activo ? "Activo" : "Suspendido"}
            </span>
            <span className="text-sm text-muted">/r/{cliente.slug}</span>
          </div>
        </div>

        <form action={logoutLocal}>
          <input type="hidden" name="slug" value={slug} />
          <button type="submit" className="btn-secondary">
            Salir
          </button>
        </form>
      </header>

      {!cliente.activo && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tu servicio está suspendido: la tarjeta NFC no está redirigiendo.
          Contactá a tu proveedor.
        </p>
      )}

      {/* Números grandes */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta
          titulo="Clicks este mes"
          valor={stats.totalMes.toLocaleString("es-AR")}
        />
        <Tarjeta
          titulo="Horario pico"
          valor={stats.horaPico === null ? "—" : formatHora(stats.horaPico)}
          detalle={
            stats.horaPico === null
              ? "Sin datos"
              : `La hora con más escaneos (${ETIQUETAS_PERIODO[periodo].toLowerCase()})`
          }
        />
        <Tarjeta
          titulo="Día más fuerte"
          valor={stats.diaPico === null ? "—" : NOMBRES_DIAS[stats.diaPico]}
          detalle={stats.diaPico === null ? "Sin datos" : "El día con más escaneos"}
        />
        <Tarjeta
          titulo="Clicks totales"
          valor={stats.totalHistorico.toLocaleString("es-AR")}
          detalle="Desde el primer día"
        />
      </section>

      {/* Selector de período */}
      <nav className="mt-8 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Ver:</span>
        {(Object.keys(ETIQUETAS_PERIODO) as Periodo[]).map((p) => (
          <Link
            key={p}
            href={`/dashboard/${slug}?periodo=${p}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              p === periodo
                ? "bg-ink text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {ETIQUETAS_PERIODO[p]}
          </Link>
        ))}
      </nav>

      {/* Gráficos */}
      <section className="mt-4 space-y-6">
        <div className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">¿A qué hora te escanean?</h2>
            <p className="text-sm text-muted">
              {stats.totalPeriodo.toLocaleString("es-AR")} clicks ·{" "}
              {ETIQUETAS_PERIODO[periodo].toLowerCase()}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Cada barra es una hora del día, de 00 a 23.
          </p>
          <div className="mt-4">
            <GraficoPorHora datos={datosHora} />
          </div>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">¿Qué días te escanean más?</h2>
            <p className="text-sm text-muted">
              {ETIQUETAS_PERIODO[periodo].toLowerCase()}
            </p>
          </div>
          <div className="mt-4">
            <GraficoPorDia datos={datosDia} />
          </div>
        </div>
      </section>

      <footer className="mt-8 text-xs text-muted">
        Horarios en {APP_TIMEZONE.replace(/_/g, " ")}.
        {stats.ultimoClick && (
          <> Último escaneo: {new Date(stats.ultimoClick).toLocaleString("es-AR", { timeZone: APP_TIMEZONE })}.</>
        )}
      </footer>
    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-muted">{titulo}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted">{detalle}</p>}
    </div>
  );
}
