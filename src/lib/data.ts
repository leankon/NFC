import "server-only";
import { getSupabase } from "@/lib/supabase";
import { inicioDelMes } from "@/lib/time";
import type { Cliente, ClienteConClicks } from "@/lib/types";

const PAGINA = 1000;
const MAX_FILAS = 50_000;

export async function obtenerClientePorSlug(
  slug: string,
): Promise<Cliente | null> {
  const { data, error } = await getSupabase()
    .from("clientes")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Cliente | null) ?? null;
}

export async function listarClientesConClicks(): Promise<ClienteConClicks[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("clientes")
    .select("id, slug, nombre_local, redirect_url, activo, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const clientes = (data ?? []) as Omit<Cliente, "password_hash">[];

  const totales = await Promise.all(
    clientes.map(async (c) => {
      const { count, error: errCount } = await supabase
        .from("clicks")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", c.id);

      if (errCount) throw new Error(errCount.message);
      return count ?? 0;
    }),
  );

  return clientes.map((c, i) => ({ ...c, total_clicks: totales[i] }));
}

export type Periodo = "mes" | "90d" | "todo";

export const ETIQUETAS_PERIODO: Record<Periodo, string> = {
  mes: "Este mes",
  "90d": "Últimos 90 días",
  todo: "Todo el historial",
};

export function esPeriodo(v: string | undefined): v is Periodo {
  return v === "mes" || v === "90d" || v === "todo";
}

function desdeDe(periodo: Periodo): Date | null {
  if (periodo === "mes") return inicioDelMes();
  if (periodo === "90d") return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return null;
}

export type Estadisticas = {
  porHora: { hora: number; clicks: number }[];
  porDia: { dia: number; clicks: number }[];
  totalPeriodo: number;
  totalMes: number;
  totalHistorico: number;
  horaPico: number | null;
  diaPico: number | null;
  ultimoClick: string | null;
};

/** Trae los clicks del cliente desde una fecha, paginando de a 1000. */
async function traerClicks(clienteId: string, desde: Date | null) {
  const supabase = getSupabase();
  const filas: { hora: number; dia_semana: number }[] = [];

  for (let offset = 0; offset < MAX_FILAS; offset += PAGINA) {
    let query = supabase
      .from("clicks")
      .select("hora, dia_semana")
      .eq("cliente_id", clienteId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + PAGINA - 1);

    if (desde) query = query.gte("timestamp", desde.toISOString());

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const lote = (data ?? []) as { hora: number; dia_semana: number }[];
    filas.push(...lote);
    if (lote.length < PAGINA) break;
  }

  return filas;
}

async function contar(clienteId: string, desde: Date | null): Promise<number> {
  let query = getSupabase()
    .from("clicks")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId);

  if (desde) query = query.gte("timestamp", desde.toISOString());

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function estadisticas(
  clienteId: string,
  periodo: Periodo,
): Promise<Estadisticas> {
  const desde = desdeDe(periodo);

  const [filas, totalMes, totalHistorico, ultimo] = await Promise.all([
    traerClicks(clienteId, desde),
    contar(clienteId, inicioDelMes()),
    contar(clienteId, null),
    getSupabase()
      .from("clicks")
      .select("timestamp")
      .eq("cliente_id", clienteId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const horas = new Array(24).fill(0) as number[];
  const dias = new Array(7).fill(0) as number[];

  for (const fila of filas) {
    if (fila.hora >= 0 && fila.hora < 24) horas[fila.hora] += 1;
    if (fila.dia_semana >= 0 && fila.dia_semana < 7) dias[fila.dia_semana] += 1;
  }

  const maxHora = Math.max(...horas);
  const maxDia = Math.max(...dias);

  return {
    porHora: horas.map((clicks, hora) => ({ hora, clicks })),
    porDia: dias.map((clicks, dia) => ({ dia, clicks })),
    totalPeriodo: filas.length,
    totalMes,
    totalHistorico,
    horaPico: maxHora > 0 ? horas.indexOf(maxHora) : null,
    diaPico: maxDia > 0 ? dias.indexOf(maxDia) : null,
    ultimoClick: (ultimo.data as { timestamp: string } | null)?.timestamp ?? null,
  };
}
