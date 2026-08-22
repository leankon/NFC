"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BASE = "#bfdbfe";
const PICO = "#2563eb";
const EJE = "#94a3b8";

type Punto = { etiqueta: string; etiquetaLarga: string; clicks: number };

function TooltipPersonalizado({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Punto }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-ink">{p.etiquetaLarga}</p>
      <p className="text-muted">
        {p.clicks.toLocaleString("es-AR")} {p.clicks === 1 ? "click" : "clicks"}
      </p>
    </div>
  );
}

function Grafico({
  datos,
  intervalo,
  alto,
}: {
  datos: Punto[];
  intervalo: number | "preserveStartEnd";
  alto: number;
}) {
  const max = Math.max(...datos.map((d) => d.clicks), 0);

  if (max === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-slate-50 text-sm text-muted"
        style={{ height: alto }}
      >
        Todavía no hay escaneos en este período.
      </div>
    );
  }

  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tick={{ fill: EJE, fontSize: 12 }}
            interval={intervalo}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: EJE, fontSize: 12 }}
            width={44}
          />
          <Tooltip
            content={<TooltipPersonalizado />}
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
          />
          <Bar dataKey="clicks" radius={[6, 6, 0, 0]} maxBarSize={54}>
            {datos.map((d, i) => (
              <Cell key={i} fill={d.clicks === max ? PICO : BASE} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoPorHora({ datos }: { datos: Punto[] }) {
  // preserveStartEnd oculta etiquetas que se pisarían pero siempre deja 00 y 23.
  return <Grafico datos={datos} intervalo="preserveStartEnd" alto={260} />;
}

export function GraficoPorDia({ datos }: { datos: Punto[] }) {
  return <Grafico datos={datos} intervalo={0} alto={240} />;
}
