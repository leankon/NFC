/**
 * Chequeo en navegador real (Playwright + Chromium).
 *
 * Verifica lo que sólo existe después de la hidratación: que Recharts dibuje
 * las barras y los ejes, que la barra pico quede resaltada y que no haya
 * errores de JS. Deja capturas en ./capturas.
 *
 * Requiere:  npm i -D playwright-core   (+ un Chromium: PLAYWRIGHT_CHROMIUM=/ruta/al/chrome)
 * Uso:       npm run build && node scripts/browser-check.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error(
    "Falta playwright-core. Instalalo con:  npm i -D playwright-core\n" +
      "y asegurate de tener un Chromium (PLAYWRIGHT_CHROMIUM o el de Playwright).",
  );
  process.exit(1);
}
import { crearServidor } from "./fake-postgrest.mjs";

const SECRETO = "secreto-de-prueba-suficientemente-largo";
const BASE = "http://127.0.0.1:3101";
const CID = "11111111-1111-4111-8111-111111111111";
const CAPTURAS = process.env.CAPTURAS ?? "capturas";
mkdirSync(CAPTURAS, { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
const check = (n, c, e = "") => { if (!c) fallos++; console.log(`${c ? "ok  " : "FALL"} ${n}${e ? " :: " + e : ""}`); };

function tok(s) {
  const p = `${s}.${Date.now() + 3600000}`;
  return `${p}.${createHmac("sha256", SECRETO).update(p).digest("base64url")}`;
}

const { db } = await crearServidor(54322);
db.clientes.push({ id: CID, slug: "cafe-test", nombre_local: "Café Test",
  redirect_url: "https://ejemplo.com/menu", activo: true, password_hash: await bcrypt.hash("clave-del-local", 10), created_at: new Date().toISOString() });
let i = 0;
const sembrar = (h, d, n) => { for (let k = 0; k < n; k++) db.clicks.push({ id: i++, cliente_id: CID, timestamp: new Date(Date.now() - k * 60000).toISOString(), hora: h, dia_semana: d }); };
sembrar(9, 1, 5); sembrar(11, 2, 9); sembrar(14, 3, 22); sembrar(18, 4, 12); sembrar(20, 5, 7); sembrar(13, 6, 15);

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3101"], {
  cwd: process.cwd(),
  env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:54322", SUPABASE_SERVICE_ROLE_KEY: "f",
    ADMIN_PASSWORD: "clave-maestra-test", SESSION_SECRET: SECRETO, NODE_ENV: "production",
    APP_TIMEZONE: "America/Argentina/Buenos_Aires" },
  stdio: ["ignore", "pipe", "pipe"] });
next.stderr.on("data", (d) => console.error("[next:err]", `${d}`.trim()));

for (let n = 0; n < 60; n++) { try { const r = await fetch(BASE + "/"); if (r.ok) break; } catch {} await esperar(400); }

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  await ctx.addCookies([{ name: "nfc_local_cafe-test", value: tok("cafe-test"), domain: "127.0.0.1", path: "/" },
                        { name: "nfc_admin", value: tok("admin"), domain: "127.0.0.1", path: "/" }]);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("requestfailed", (rq) => { const t = rq.failure()?.errorText ?? ""; if (t === "net::ERR_ABORTED" && rq.url().includes("_rsc=")) return; errores.push("requestfailed " + t + " " + rq.url()); });
  page.on("response", (rs) => rs.status() >= 400 && errores.push(rs.status() + " " + rs.url()));

  await page.goto(`${BASE}/dashboard/cafe-test?periodo=todo`, { waitUntil: "networkidle" });
  await page.waitForSelector(".recharts-bar-rectangle", { state: "attached", timeout: 15000 });
  await esperar(600);

  const barras = await page.locator(".recharts-bar-rectangle").count();
  check("se dibujan las barras", barras >= 31, `barras=${barras}`);

  const ticksX = await page.locator(".recharts-xAxis .recharts-cartesian-axis-tick-value").allTextContents();
  check("el eje horario tiene 00 y 23", ticksX.includes("00") && ticksX.includes("23"), ticksX.slice(0, 5).join(","));
  check("el eje de días está en castellano", ticksX.includes("Lun") && ticksX.includes("Dom"),
    ticksX.slice(-8).join(","));

  check("el horario pico se muestra", (await page.getByText("14:00").count()) > 0);
  check("el día más fuerte se muestra", (await page.getByText("Miércoles").count()) > 0);
  check("sin errores de JS en consola", errores.length === 0, errores.join(" | "));

  // La barra del pico usa el color destacado.
  const rellenos = await page.locator("#__next, body").first().evaluate(() =>
    [...document.querySelectorAll(".recharts-bar-rectangle path")].map((p) => p.getAttribute("fill")));
  check("la barra pico se resalta con otro color", new Set(rellenos).size >= 2, [...new Set(rellenos)].join(","));

  await page.screenshot({ path: CAPTURAS + "/dashboard.png", fullPage: true });

  // Panel admin
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  check("el panel admin carga", (await page.getByText("Administración").count()) > 0);
  await page.getByRole("button", { name: "+ Crear cliente" }).click();
  check("el formulario de alta se abre", await page.locator('input[name="nombre_local"]').isVisible());

  // Alta completa de un cliente (server action de punta a punta).
  await page.fill('input[name="nombre_local"]', "Pizzería Ñandú");
  await page.fill('input[name="redirect_url"]', "instagram.com/pizzeria");
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await page.waitForSelector("text=Credenciales de", { timeout: 15000 });

  const creado = db.clientes.find((c) => c.nombre_local === "Pizzería Ñandú");
  check("el cliente se creó en la base", Boolean(creado));
  check("el slug se genera sin acentos", creado?.slug === "pizzeria-nandu", creado?.slug);
  check("la URL se normaliza a https", creado?.redirect_url === "https://instagram.com/pizzeria", creado?.redirect_url);
  check("se guarda un hash bcrypt, no la contraseña", Boolean(creado?.password_hash?.startsWith("$2")));
  check("el cliente nace activo", creado?.activo === true);

  const textoCreds = await page.locator("text=Credenciales de").locator("..").innerText();
  const clave = textoCreds.match(/Contraseña\n?\s*([A-Za-z0-9]{10})/)?.[1];
  check("muestra la contraseña generada una sola vez", Boolean(clave), textoCreds.replace(/\n/g, " ").slice(0, 90));
  check("muestra el link NFC del cliente nuevo", textoCreds.includes("/r/pizzeria-nandu"));
  if (clave) {
    check("la contraseña mostrada valida contra el hash",
      await bcrypt.compare(clave, creado.password_hash));
  }

  await page.screenshot({ path: CAPTURAS + "/admin.png", fullPage: true });

  // Activar / desactivar
  await page.reload({ waitUntil: "networkidle" });
  const filaNueva = page.locator("tr", { hasText: "Pizzería Ñandú" }).first();
  await filaNueva.getByRole("button", { name: "Activo" }).click();
  await page.waitForSelector("text=Inactivo", { timeout: 15000 });
  check("el botón de estado desactiva al cliente",
    db.clientes.find((c) => c.slug === "pizzeria-nandu")?.activo === false);

  // Editar slug y URL de destino
  await page.locator("tr", { hasText: "Pizzería Ñandú" }).first().getByRole("button", { name: "Editar" }).click();
  const edicion = page.locator('form:has(input[name="slug"][value="pizzeria-nandu"])');
  await edicion.locator('input[name="slug"]').fill("pizza-nandu");
  await edicion.locator('input[name="redirect_url"]').fill("https://instagram.com/otra-cuenta");
  await edicion.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForSelector("text=Cambios guardados", { timeout: 15000 });
  const editado = db.clientes.find((c) => c.nombre_local === "Pizzería Ñandú");
  check("el slug se puede editar", editado?.slug === "pizza-nandu", editado?.slug);
  check("la URL de destino se puede editar",
    editado?.redirect_url === "https://instagram.com/otra-cuenta", editado?.redirect_url);

  // Pantalla de login del local
  const ctx2 = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/dashboard/cafe-test`, { waitUntil: "networkidle" });
  check("la pantalla de login del local carga", await p2.locator('input[name="password"]').isVisible());
  await p2.screenshot({ path: CAPTURAS + "/login.png" });

  // Contraseña equivocada
  await p2.fill('input[name="password"]', "no-es-la-clave");
  await p2.getByRole("button", { name: "Ver mis estadísticas" }).click();
  await p2.waitForSelector("text=Contraseña incorrecta", { timeout: 15000 });
  check("rechaza la contraseña equivocada", (await p2.getByText("Horario pico").count()) === 0);

  // Contraseña correcta
  await p2.fill('input[name="password"]', "clave-del-local");
  await p2.getByRole("button", { name: "Ver mis estadísticas" }).click();
  await p2.waitForSelector("text=Horario pico", { timeout: 15000 });
  check("entra con la contraseña correcta", (await p2.getByText("Café Test").count()) > 0);

  // Salir
  await p2.getByRole("button", { name: "Salir" }).click();
  await p2.waitForSelector('input[name="password"]', { timeout: 15000 });
  check("el botón Salir cierra la sesión", (await p2.getByText("Horario pico").count()) === 0);

  // Pantalla de suspendido
  db.clientes[0].activo = false;
  await p2.goto(`${BASE}/r/cafe-test`, { waitUntil: "networkidle" });
  check("la pantalla de suspendido se ve", (await p2.getByText("Servicio suspendido").count()) > 0);
  await p2.screenshot({ path: CAPTURAS + "/suspendido.png" });
} finally {
  await browser.close();
  next.kill("SIGTERM");
  await esperar(400);
}
console.log(fallos === 0 ? "\n✅ Browser OK" : `\n❌ ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
