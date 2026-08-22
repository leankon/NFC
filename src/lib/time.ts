/**
 * Todas las métricas se calculan en la zona horaria del negocio para que
 * "hora pico" signifique algo real. Configurable con APP_TIMEZONE.
 */
export const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "America/Argentina/Buenos_Aires";

const DIAS_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  hour12: false,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partes(date: Date): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of formatter.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** Hora local 0-23 y día de la semana 0-6 (0 = domingo). */
export function horaYDia(date: Date = new Date()): {
  hora: number;
  dia_semana: number;
} {
  const p = partes(date);
  // "24" aparece en algunos entornos para la medianoche con hour12:false.
  const hora = Number(p.hour) % 24;
  const dia_semana = DIAS_INDEX[p.weekday] ?? 0;
  return { hora, dia_semana };
}

/** Diferencia (ms) entre la hora local del negocio y UTC en ese instante. */
function offsetEn(date: Date): number {
  const p = partes(date);
  const comoUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return comoUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Instante UTC en el que arrancó el mes en curso según la zona del negocio.
 * Se calcula en dos pasos para que un cambio de horario de verano entre hoy
 * y el día 1 no corra el límite del mes.
 */
export function inicioDelMes(now: Date = new Date()): Date {
  const p = partes(now);
  const medianocheLocal = Date.UTC(Number(p.year), Number(p.month) - 1, 1, 0, 0, 0);

  let instante = new Date(medianocheLocal - offsetEn(now));
  instante = new Date(medianocheLocal - offsetEn(instante));
  return instante;
}

export const NOMBRES_DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const NOMBRES_DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** "14:00" a partir de 14 */
export function formatHora(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}
