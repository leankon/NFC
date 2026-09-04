# NFC Redirect

Web app para tarjetas NFC de locales: cada tarjeta apunta a `/r/<slug>`, la app
redirige al destino que tenga configurado el cliente y registra el escaneo.
Cada local ve sus propias estadísticas; vos administrás todo desde un panel.

- **`/r/[slug]`** — redirección instantánea + registro del click.
- **`/admin`** — panel maestro: alta de clientes, activar/desactivar, editar
  slug y destino, total de clicks.
- **`/dashboard/[slug]`** — panel del local: clicks por hora, por día de la
  semana, total del mes y horario pico.

Stack: Next.js 14 (app router) · Supabase · Recharts · Tailwind CSS · Vercel.

---

## 1. Base de datos

En Supabase → **SQL Editor** → **New query**, pegá y ejecutá
[`supabase/schema.sql`](supabase/schema.sql) completo. Crea:

| Tabla      | Columnas |
|------------|----------|
| `clientes` | `id`, `slug`, `nombre_local`, `redirect_url`, `activo`, `password_hash`, `created_at` |
| `clicks`   | `id`, `cliente_id`, `timestamp`, `hora` (0-23), `dia_semana` (0-6, 0 = domingo) |

El script también activa RLS sin políticas públicas: la app entera corre en el
servidor con la *service role key*, así que nadie puede leer ni escribir con la
clave anónima.

## 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | URL del proyecto (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta.** Solo se usa en el servidor |
| `ADMIN_PASSWORD` | Contraseña maestra de `/admin` |
| `SESSION_SECRET` | Firma las cookies de sesión (mín. 16 caracteres) |
| `CRON_SECRET` | Opcional pero recomendada. Protege la tarea que mantiene despierta a Supabase |
| `APP_TIMEZONE` | Opcional. Zona horaria del negocio. Default: `America/Argentina/Buenos_Aires` |
| `NEXT_PUBLIC_SITE_URL` | Opcional. Solo si usás dominio propio |

```bash
# Para generar el secreto de sesión:
openssl rand -base64 32
```

> `SUPABASE_URL` **no** lleva el prefijo `NEXT_PUBLIC_` a propósito: se lee en
> tiempo de ejecución y nunca se envía al navegador. Si venís de la integración
> oficial de Supabase en Vercel, que define `NEXT_PUBLIC_SUPABASE_URL`, ese
> nombre también funciona como alternativa.

## 3. Correrlo

```bash
npm install
npm run dev          # http://localhost:3000
```

## 4. Deploy en Vercel

1. Importá el repo en Vercel (detecta Next.js solo).
2. Cargá las variables de entorno de arriba en **Settings → Environment Variables**.
3. Deploy.

Las tres rutas son dinámicas (`force-dynamic`), así que no hay nada que
revalidar ni cachés que limpiar.

---

## Cómo se usa

### Dar de alta un local

1. Entrá a `/admin` con la contraseña maestra.
2. **+ Crear cliente** → nombre del local y destino. El slug se genera solo a
   partir del nombre (podés escribir uno propio) y se crea una contraseña
   aleatoria.

   Con **"Es para pedir reseñas en Google"** tildado (lo normal), pegás el link
   del local en Google Maps y la app lo convierte en el link que abre directo
   la ventana de reseñas. Destildala para guardar cualquier otra URL tal cual.
3. La pantalla te muestra el **link NFC**, el **link del panel** y la
   **contraseña**. Copialas: la contraseña no se puede volver a ver, solo
   regenerar con **Nueva clave**.
4. Grabá el link NFC (`https://tu-dominio.com/r/<slug>`) en la tarjeta.

### Suspender un local

Tocá el chip **Activo** en la tabla. La tarjeta deja de redirigir y muestra
*"Servicio suspendido — contactá a tu proveedor"*. Los escaneos de un local
suspendido no se registran.

### Lo que ve el local

En `/dashboard/<slug>`, con su contraseña: nombre, estado, clicks del mes,
horario pico, día más fuerte, total histórico y dos gráficos de barras (por
hora del día y por día de la semana). El selector de arriba cambia el período
entre este mes, los últimos 90 días y todo el historial.

---

## Notas de implementación

**Link de reseñas de Google.** Una URL de Maps trae el identificador interno
del lugar (`!1s0x…:0x…`), y el Place ID que necesita Google es exactamente esos
dos números de 64 bits en protobuf y base64url. Así que la conversión se
calcula en `src/lib/google.ts`, sin API key ni llamadas a Google. Los links
cortos (`maps.app.goo.gl`) sí requieren seguir el redirect, y eso solo salta
entre hosts de Google.

**Que Supabase no se pause.** El plan gratuito suspende los proyectos que pasan
varios días sin recibir consultas, y eso deja sin funcionar todas las tarjetas
a la vez. `vercel.json` declara una tarea que llama a `/api/cron/ping` cada 4
días; esa ruta hace un `count` y nada más. El margen es holgado: el hueco más
largo entre disparos es de 3 días contra los 7 que tarda la suspensión.

Con `CRON_SECRET` definida, la ruta exige ese valor en el header
`Authorization` — Vercel lo manda solo. Sin la variable la ruta queda abierta
pero funciona igual, a propósito: es preferible una ruta pública que solo
cuenta filas antes que un ping que falla en silencio y deja que el proyecto se
duerma.

**Horarios.** `hora` y `dia_semana` se calculan al momento del click en la zona
horaria de `APP_TIMEZONE`, no en UTC — así "horario pico" significa algo para el
local. El cálculo contempla los cambios de horario de verano.

**Velocidad de la redirección.** `/r/[slug]` hace una consulta, escribe el click
y responde un 307. Si la escritura tarda más de 1,5 s, redirige igual: el
escaneo nunca espera a la base.

**Sesiones.** Cookies `httpOnly` firmadas con HMAC-SHA256 (`SESSION_SECRET`),
válidas 12 horas. La cookie de un local está atada a su slug, así que no sirve
para ver el panel de otro. Las contraseñas de los locales se guardan con bcrypt.

**Fuerza bruta.** Los dos formularios de login tienen un límite de intentos en
memoria (8 cada 10 minutos por IP). En serverless cada instancia tiene el suyo,
así que corta los intentos obvios pero no reemplaza a un rate limit externo si
lo necesitás más estricto.

---

## Tests

```bash
npm test              # zona horaria + links de Google + build + smoke end-to-end
npm run test:time     # solo el cálculo de hora/día/mes
npm run test:google   # solo la conversión de Maps a link de reseñas
npm run test:smoke    # solo el smoke (necesita un build previo)
```

`scripts/smoke.mjs` levanta un PostgREST falso en memoria y un `next start`
real, y recorre los tres flujos: redirección y registro de clicks, pantalla de
suspendido, 404, los gates de autorización de `/admin` y `/dashboard`, y el
cálculo de las estadísticas. No necesita una Supabase de verdad.

Hay además un chequeo en navegador real, que verifica lo que solo existe
después de la hidratación (barras y ejes de Recharts, alta de clientes,
activar/desactivar, edición de slug y URL, login del local):

```bash
npm i -D playwright-core
npm run build && npm run test:browser     # deja capturas en ./capturas
```

## Instalarlo en el celular

El sitio se puede agregar a la pantalla de inicio y se abre sin la barra del
navegador, con su propio ícono.

- **Android (Chrome):** menú de tres puntos → *Instalar aplicación* o
  *Agregar a pantalla principal*.
- **iPhone (Safari):** botón de compartir → *Agregar a pantalla de inicio*.
  Tiene que ser Safari; desde Chrome en iOS no aparece la opción.

Si en vez de la portada querés el acceso directo al panel, entrá primero a
`/admin` y hacé el mismo paso desde ahí: el ícono queda apuntando a esa página.

## Pendientes

Lo que conviene mejorar y todavía no está hecho está en
[`MEJORAS.md`](MEJORAS.md), ordenado por riesgo: la pausa automática de
Supabase, la gestión de cobros y la tendencia mes a mes son los tres primeros.

## Seguridad

`npm audit` reporta un aviso *high* sobre `next` cuyo rango cubre **todas** las
versiones 14.x y 15.x: la primera sin el aviso es la 16.3.2, un salto de dos
majors. Como el pedido era Next 14 (app router), el proyecto queda en
**14.2.35**, la última 14.x publicada con parches. Next 16 sigue teniendo app
router, así que la migración es viable si querés cerrar el aviso.

El resto del árbol está limpio: `postcss` se fuerza con un `overrides` en
`package.json` porque Next 14 arrastra una versión con avisos propios.
