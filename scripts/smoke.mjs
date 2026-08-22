/**
 * Smoke test end-to-end contra el build de producción.
 *
 * Levanta un PostgREST falso en memoria (scripts/fake-postgrest.mjs) y un
 * `next start`, y recorre los tres flujos de la app: /r/[slug], /admin y
 * /dashboard/[slug].
 *
 * Uso:  npm run build && node scripts/smoke.mjs
 */
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { crearServidor } from "./fake-postgrest.mjs";

const PUERTO_NEXT = 3100;
const PUERTO_DB = 54321;
const BASE = `http://127.0.0.1:${PUERTO_NEXT}`;
const SECRETO = "secreto-de-prueba-suficientemente-largo";
const CLAVE_MAESTRA = "clave-maestra-test";

const CLIENTE_A = "11111111-1111-4111-8111-111111111111";
const CLIENTE_B = "22222222-2222-4222-8222-222222222222";

let fallos = 0;
const check = (nombre, cond, extra = "") => {
  if (!cond) fallos++;
  console.log(`${cond ? "ok  " : "FALL"} ${nombre}${extra ? ` :: ${extra}` : ""}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Cookies de sesión (mismo formato que src/lib/session.ts) -------------
function token(sujeto, vencimiento = Date.now() + 3_600_000) {
  const payload = `${sujeto}.${vencimiento}`;
  const firma = createHmac("sha256", SECRETO).update(payload).digest("base64url");
  return `${payload}.${firma}`;
}
const cookieAdmin = (t = token("admin")) => `nfc_admin=${t}`;
const cookieLocal = (slug, t = token(slug)) => `nfc_local_${slug}=${t}`;

const get = (path, cookie) =>
  fetch(BASE + path, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });

async function esperarServidor() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(BASE + "/", { redirect: "manual" });
      if (r.status < 500) return;
    } catch {}
    await esperar(400);
  }
  throw new Error("Next no arrancó");
}

// ------------------------------------------------------------------------
const { db } = await crearServidor(PUERTO_DB);
console.log("· fake postgrest arriba");

const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(PUERTO_NEXT)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${PUERTO_DB}`,
      SUPABASE_SERVICE_ROLE_KEY: "fake-key",
      ADMIN_PASSWORD: CLAVE_MAESTRA,
      SESSION_SECRET: SECRETO,
      APP_TIMEZONE: "America/Argentina/Buenos_Aires",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
next.stdout.on("data", (d) => process.env.VERBOSE && console.log("[next]", `${d}`.trim()));
next.stderr.on("data", (d) => console.error("[next:err]", `${d}`.trim()));

try {
  await esperarServidor();
  console.log("· next arriba\n");

  db.clientes.push({
    id: CLIENTE_A,
    slug: "cafe-test",
    nombre_local: "Café Test",
    redirect_url: "https://ejemplo.com/menu",
    activo: true,
    password_hash: await bcrypt.hash("clave-del-local", 10),
    created_at: new Date().toISOString(),
  });
  db.clientes.push({
    id: CLIENTE_B,
    slug: "otro-local",
    nombre_local: "Otro Local",
    redirect_url: "https://ejemplo.com/otro",
    activo: true,
    password_hash: await bcrypt.hash("otra-clave", 10),
    created_at: new Date().toISOString(),
  });

  // ==================== 1. Redirección /r/[slug] ====================
  console.log("— Redirección /r/[slug]");

  let r = await get("/r/cafe-test");
  check("redirige con 307", r.status === 307, `status ${r.status}`);
  check("apunta al redirect_url", r.headers.get("location") === "https://ejemplo.com/menu",
    r.headers.get("location") ?? "sin location");

  await esperar(250);
  check("registra el click", db.clicks.length === 1, `clicks=${db.clicks.length}`);
  if (db.clicks.length) {
    const c = db.clicks[0];
    check("hora entre 0 y 23", Number.isInteger(c.hora) && c.hora >= 0 && c.hora < 24, `hora=${c.hora}`);
    check("dia_semana entre 0 y 6", Number.isInteger(c.dia_semana) && c.dia_semana >= 0 && c.dia_semana < 7, `dia=${c.dia_semana}`);
    check("el click apunta al cliente", c.cliente_id === CLIENTE_A);
    check("el click trae timestamp", typeof c.timestamp === "string" && !Number.isNaN(Date.parse(c.timestamp)));
  }

  await get("/r/cafe-test");
  await esperar(250);
  check("dos escaneos = dos clicks", db.clicks.length === 2, `clicks=${db.clicks.length}`);

  check("cada slug registra en su propio cliente",
    (await get("/r/otro-local")).headers.get("location") === "https://ejemplo.com/otro");
  await esperar(250);
  check("el click del segundo local no se mezcla",
    db.clicks.filter((c) => c.cliente_id === CLIENTE_B).length === 1);

  r = await get("/r/no-existe");
  check("slug inexistente da 404", r.status === 404, `status ${r.status}`);
  check("slug inexistente no registra nada", db.clicks.length === 3, `clicks=${db.clicks.length}`);

  db.clientes[0].activo = false;
  r = await get("/r/cafe-test");
  const htmlSuspendido = await r.text();
  check("suspendido responde 200 sin redirigir", r.status === 200 && !r.headers.get("location"));
  check('suspendido dice "Servicio suspendido"', htmlSuspendido.includes("Servicio suspendido"));
  check('suspendido dice "contactá a tu proveedor"', htmlSuspendido.includes("contactá a tu proveedor"));
  await esperar(250);
  check("suspendido NO registra click", db.clicks.length === 3, `clicks=${db.clicks.length}`);
  db.clientes[0].activo = true;

  // ==================== 2. Panel /admin ====================
  console.log("\n— Panel /admin");

  let html = await (await get("/admin")).text();
  check("sin sesión pide la contraseña maestra", html.includes("Contraseña maestra"));
  check("sin sesión no filtra la lista de clientes", !html.includes("Café Test"));

  html = await (await get("/admin", "nfc_admin=admin.9999999999999.firma-falsa")).text();
  check("rechaza una cookie con firma inválida", html.includes("Contraseña maestra"));

  html = await (await get("/admin", cookieAdmin(token("admin", Date.now() - 1000)))).text();
  check("rechaza una cookie vencida", html.includes("Contraseña maestra"));

  html = await (await get("/admin", cookieAdmin())).text();
  check("con sesión muestra el panel", html.includes("Administración"));
  check("lista los clientes", html.includes("Café Test") && html.includes("Otro Local"));
  check("muestra el link /r/ de cada cliente", html.includes("/r/cafe-test"));
  check("muestra el destino", html.includes("https://ejemplo.com/menu"));
  check("muestra el total de clicks del cliente", /Café Test[\s\S]{0,1200}>2</.test(html), "esperábamos 2 clicks");
  check("muestra el estado activo/inactivo", html.includes("Activo"));
  check("ofrece crear un cliente nuevo", html.includes("Crear cliente"));

  // ==================== 3. Dashboard /dashboard/[slug] ====================
  console.log("\n— Dashboard del local");

  // Clicks sembrados con un pico claro a las 14 y el miércoles.
  const ahora = Date.now();
  let id = 1000;
  const sembrar = (hora, dia, cuantos, minutosAtras = 5) => {
    for (let i = 0; i < cuantos; i++) {
      db.clicks.push({
        id: id++,
        cliente_id: CLIENTE_A,
        timestamp: new Date(ahora - (minutosAtras + i) * 60_000).toISOString(),
        hora,
        dia_semana: dia,
      });
    }
  };
  sembrar(9, 1, 4);
  sembrar(12, 2, 7);
  sembrar(14, 3, 21); // pico
  sembrar(20, 5, 6);

  html = await (await get("/dashboard/cafe-test")).text();
  check("sin sesión pide contraseña", html.includes("Ingresá la contraseña"));
  check("sin sesión no filtra estadísticas", !html.includes("Horario pico"));

  html = await (await get("/dashboard/cafe-test", cookieLocal("cafe-test", "cafe-test.9999999999999.x"))).text();
  check("rechaza cookie con firma inválida", html.includes("Ingresá la contraseña"));

  html = await (await get("/dashboard/cafe-test", cookieLocal("otro-local"))).text();
  check("la sesión de un local no abre el panel de otro", html.includes("Ingresá la contraseña"));

  html = await (await get("/dashboard/cafe-test?periodo=todo", cookieLocal("cafe-test"))).text();
  check("muestra el nombre del local", html.includes("Café Test"));
  check("muestra el estado", html.includes("Activo"));
  check("muestra el horario pico", html.includes("Horario pico"));
  check("el horario pico calculado es 14:00", html.includes("14:00"));
  check("muestra el día más fuerte (miércoles)", html.includes("Miércoles"));
  check("muestra los clicks del mes", html.includes("Clicks este mes"));
  check("muestra el gráfico por hora", html.includes("¿A qué hora te escanean?"));
  check("muestra el gráfico por día", html.includes("¿Qué días te escanean más?"));
  check("los gráficos se renderizan con recharts", html.includes("recharts-"));
  // Recharts dibuja ejes y barras recién en el cliente (necesita el ancho real),
  // así que las etiquetas de los ejes se verifican en scripts/browser-check.mjs.

  const totalSembrado = 2 + 4 + 7 + 21 + 6; // 2 escaneos reales + los sembrados
  check("el total histórico cuadra", html.includes(String(totalSembrado)), `esperábamos ${totalSembrado}`);

  // Local suspendido: el dashboard lo avisa.
  db.clientes[0].activo = false;
  html = await (await get("/dashboard/cafe-test", cookieLocal("cafe-test"))).text();
  check("avisa cuando el servicio está suspendido",
    html.includes("Suspendido") && html.includes("no está redirigiendo"));
  db.clientes[0].activo = true;

  // Períodos
  for (const periodo of ["mes", "90d", "todo"]) {
    const res = await get(`/dashboard/cafe-test?periodo=${periodo}`, cookieLocal("cafe-test"));
    check(`el período "${periodo}" responde 200`, res.status === 200, `status ${res.status}`);
  }
  html = await (await get("/dashboard/cafe-test?periodo=basura", cookieLocal("cafe-test"))).text();
  check("un período inválido cae en 'Este mes'", html.includes("Este mes"));

  // Local sin datos todavía
  html = await (await get("/dashboard/otro-local", cookieLocal("otro-local"))).text();
  check("un local con 1 solo click no rompe", html.includes("Otro Local") && html.includes("Horario pico"));

  // ==================== 4. Hash de contraseñas ====================
  console.log("\n— Contraseñas");
  const hash = db.clientes[0].password_hash;
  check("el hash guardado es bcrypt", hash.startsWith("$2"));
  check("la contraseña correcta valida", await bcrypt.compare("clave-del-local", hash));
  check("una contraseña equivocada no valida", !(await bcrypt.compare("otra", hash)));
} finally {
  next.kill("SIGTERM");
  await esperar(500);
}

console.log(fallos === 0 ? "\n✅ Todo OK" : `\n❌ ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
