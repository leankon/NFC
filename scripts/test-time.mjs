// Chequeo rápido de src/lib/time.ts (se ejecuta con: node scripts/test-time.mjs)
import { execSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

const casos = [
  { tz: "America/Argentina/Buenos_Aires", iso: "2026-08-22T03:30:00Z", hora: 0, dia: 6 },
  { tz: "America/Argentina/Buenos_Aires", iso: "2026-08-22T02:59:00Z", hora: 23, dia: 5 },
  { tz: "America/Argentina/Buenos_Aires", iso: "2026-08-22T17:05:00Z", hora: 14, dia: 6 },
  { tz: "UTC", iso: "2026-01-04T00:00:00Z", hora: 0, dia: 0 },
  // Zona con DST: Nueva York en pleno verano (UTC-4).
  { tz: "America/New_York", iso: "2026-07-15T13:00:00Z", hora: 9, dia: 3 },
  { tz: "America/New_York", iso: "2026-01-15T13:00:00Z", hora: 8, dia: 4 },
  // Al otro lado de la línea de fecha.
  { tz: "Asia/Tokyo", iso: "2026-03-01T20:00:00Z", hora: 5, dia: 1 },
];

const mesEsperado = [
  { tz: "America/Argentina/Buenos_Aires", iso: "2026-08-22T17:05:00Z", inicio: "2026-08-01T03:00:00.000Z" },
  { tz: "UTC", iso: "2026-08-22T17:05:00Z", inicio: "2026-08-01T00:00:00.000Z" },
  // Marzo en NY arranca en EST (-5) aunque hoy ya sea EDT (-4): probamos el salto.
  { tz: "America/New_York", iso: "2026-03-20T12:00:00Z", inicio: "2026-03-01T05:00:00.000Z" },
  { tz: "Asia/Tokyo", iso: "2026-08-22T17:05:00Z", inicio: "2026-07-31T15:00:00.000Z" },
];

let fallos = 0;
const check = (nombre, actual, esperado) => {
  const ok = String(actual) === String(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? "ok  " : "FALL"} ${nombre} -> ${actual}${ok ? "" : ` (esperado ${esperado})`}`);
};

const tmp = new URL("./.time-runner.mjs", import.meta.url).pathname;

for (const tz of [...new Set([...casos, ...mesEsperado].map((c) => c.tz))]) {
  writeFileSync(
    tmp,
    `process.env.APP_TIMEZONE = ${JSON.stringify(tz)};
     const { horaYDia, inicioDelMes } = await import("../src/lib/time.ts");
     const out = [];
     for (const iso of ${JSON.stringify([...casos, ...mesEsperado].filter((c) => c.tz === tz).map((c) => c.iso))}) {
       const d = new Date(iso);
       out.push({ iso, ...horaYDia(d), inicio: inicioDelMes(d).toISOString() });
     }
     console.log(JSON.stringify(out));`,
  );

  const salida = execSync(`node --experimental-strip-types ${tmp}`, {
    cwd: new URL(".", import.meta.url).pathname,
    stdio: ["ignore", "pipe", "pipe"],
  })
    .toString()
    .trim();

  const filas = JSON.parse(salida.split("\n").pop());
  const porIso = Object.fromEntries(filas.map((f) => [f.iso, f]));

  for (const c of casos.filter((c) => c.tz === tz)) {
    check(`${tz} ${c.iso} hora`, porIso[c.iso].hora, c.hora);
    check(`${tz} ${c.iso} dia_semana`, porIso[c.iso].dia_semana, c.dia);
  }
  for (const c of mesEsperado.filter((c) => c.tz === tz)) {
    check(`${tz} ${c.iso} inicioDelMes`, porIso[c.iso].inicio, c.inicio);
  }
}

rmSync(tmp, { force: true });
console.log(fallos === 0 ? "\nTodo OK" : `\n${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
