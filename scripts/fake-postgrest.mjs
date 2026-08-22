/**
 * Servidor PostgREST mínimo en memoria, solo para smoke tests locales.
 * NO forma parte de la app: reemplaza a Supabase para poder probar los
 * flujos completos sin una base real.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const db = { clientes: [], clicks: [] };
let clickId = 1;

const parseFiltro = (valor) => {
  const [op, ...resto] = valor.split(".");
  return { op, valor: resto.join(".") };
};

function aplicarFiltros(filas, params) {
  let out = filas;
  for (const [col, raw] of params.entries()) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(col)) continue;
    const { op, valor } = parseFiltro(raw);
    out = out.filter((f) => {
      const v = f[col];
      if (op === "eq") return String(v) === valor;
      if (op === "neq") return String(v) !== valor;
      if (op === "gte") return new Date(v).getTime() >= new Date(valor).getTime();
      if (op === "lte") return new Date(v).getTime() <= new Date(valor).getTime();
      return true;
    });
  }
  return out;
}

function ordenar(filas, params) {
  const order = params.get("order");
  if (!order) return filas;
  const [col, dir] = order.split(".");
  const desc = dir === "desc";
  return [...filas].sort((a, b) => {
    const av = a[col], bv = b[col];
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return desc ? -cmp : cmp;
  });
}

const leerCuerpo = (req) =>
  new Promise((res) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => res(d ? JSON.parse(d) : null));
  });

export function crearServidor(puerto = 54321) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const tabla = url.pathname.replace("/rest/v1/", "");
    const params = url.searchParams;
    const objeto = (req.headers.accept ?? "").includes("vnd.pgrst.object");
    const json = (code, body, extra = {}) => {
      res.writeHead(code, { "content-type": "application/json", ...extra });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };

    if (!db[tabla]) return json(404, { message: `tabla ${tabla} inexistente` });

    if (req.method === "HEAD" || req.method === "GET") {
      let filas = ordenar(aplicarFiltros(db[tabla], params), params);
      const total = filas.length;

      const range = req.headers.range;
      if (range) {
        const [a, b] = range.split("-").map(Number);
        filas = filas.slice(a, b + 1);
      }
      const limit = params.get("limit");
      if (limit) filas = filas.slice(0, Number(limit));

      const headers = { "content-range": `0-${Math.max(total - 1, 0)}/${total}` };
      if (req.method === "HEAD") {
        res.writeHead(200, headers);
        return res.end();
      }
      if (objeto) {
        if (filas.length === 1) return json(200, filas[0], headers);
        if (filas.length === 0)
          return json(406, { code: "PGRST116", message: "0 rows", details: "Results contain 0 rows" }, headers);
        return json(406, { code: "PGRST116", message: "multiple rows" }, headers);
      }
      return json(200, filas, headers);
    }

    if (req.method === "POST") {
      const cuerpo = await leerCuerpo(req);
      const items = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
      const creados = [];
      for (const it of items) {
        if (tabla === "clientes") {
          if (db.clientes.some((c) => c.slug === it.slug))
            return json(409, { code: "23505", message: "duplicate key value violates unique constraint" });
          creados.push({ id: randomUUID(), activo: true, created_at: new Date().toISOString(), ...it });
        } else {
          creados.push({ id: clickId++, timestamp: new Date().toISOString(), ...it });
        }
      }
      db[tabla].push(...creados);
      const minimal = (req.headers.prefer ?? "").includes("return=minimal");
      return json(201, minimal ? undefined : creados);
    }

    if (req.method === "PATCH") {
      const cuerpo = await leerCuerpo(req);
      const filas = aplicarFiltros(db[tabla], params);
      if (tabla === "clientes" && cuerpo.slug) {
        const choque = db.clientes.find((c) => c.slug === cuerpo.slug && !filas.includes(c));
        if (choque) return json(409, { code: "23505", message: "duplicate key" });
      }
      for (const f of filas) Object.assign(f, cuerpo);
      return json(204, undefined);
    }

    if (req.method === "DELETE") {
      const filas = new Set(aplicarFiltros(db[tabla], params));
      db[tabla] = db[tabla].filter((f) => !filas.has(f));
      if (tabla === "clientes") {
        const ids = new Set([...filas].map((f) => f.id));
        db.clicks = db.clicks.filter((c) => !ids.has(c.cliente_id));
      }
      return json(204, undefined);
    }

    json(405, { message: "método no soportado" });
  });

  return new Promise((resolve) => server.listen(puerto, () => resolve({ server, db })));
}

if (process.argv[1]?.endsWith("fake-postgrest.mjs")) {
  const { db: store } = await crearServidor(Number(process.env.PORT ?? 54321));
  console.log("fake postgrest escuchando");
  process.on("message", (m) => {
    if (m === "dump") process.send(JSON.stringify(store));
  });
}
