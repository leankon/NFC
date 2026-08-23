# Mejoras pendientes

Backlog de lo que conviene cambiar, ordenado por riesgo real para el negocio
(vender tarjetas NFC de reseñas a locales, con cuota mensual). Nada de esto
está implementado todavía.

Cada punto dice **qué pasa hoy**, **por qué importa** y **por dónde se
resuelve**, para poder retomarlo sin volver a investigarlo.

---

## Urgente

### 1. Supabase gratis se pausa sola por inactividad

**Hoy.** El plan free de Supabase suspende los proyectos que pasan varios días
sin recibir consultas. Nada en la app evita que eso pase.

**Por qué importa.** Es el peor modo de falla que tiene el sistema: no se cae
un local, se caen **todos a la vez**. El cliente final ve *"No pudimos
redirigirte"* y el aviso llega por un llamado enojado. Además es más probable
justo al principio, cuando hay pocos locales y se escanean poco — que es
cuando peor cae.

**Por dónde.** Una tarea programada diaria que haga una consulta trivial a la
base. Vercel tiene cron en el plan gratuito (una vez por día). Sería un route
handler tipo `/api/cron/ping` que haga un `select` de una fila, más la entrada
correspondiente en `vercel.json`. Conviene protegerlo con un secreto en el
header para que no lo pueda disparar cualquiera.

Verificar el plazo exacto de suspensión en el panel de Supabase: la política
cambia con el tiempo.

### 2. No hay gestión de cobros

**Hoy.** El estado activo/inactivo se cambia a mano y no hay ningún registro de
quién pagó ni hasta cuándo. Depende de la memoria del administrador.

**Por qué importa.** El modelo de negocio es mensual. Es lo que más fricción
diaria genera y lo primero que se rompe cuando haya 20 clientes en vez de 3.

**Por dónde.** Una columna `vence_el date` en `clientes`. En `/admin`, una
franja arriba de la tabla con el resumen (*"2 vencen esta semana, 1 vencido"*)
y la fecha en cada fila, resaltada cuando falta poco o ya pasó. Ordenar la
tabla por vencimiento más próximo.

Como paso siguiente, opcional: suspender automáticamente al vencer. Conviene
que sea opt-in por cliente, no global — hay locales a los que uno prefiere
darles unos días de gracia.

### 3. El panel no muestra tendencia, solo el total histórico

**Hoy.** La columna de clicks en `/admin` es el acumulado de todos los tiempos.

**Por qué importa.** Ese número no sirve para decidir nada: un local que
explotó hace seis meses y hoy está muerto se ve igual de bien que uno que
está creciendo. Lo que hace falta en la conversación de renovación es **este
mes contra el mes pasado**. Es el argumento de venta y también la alerta
temprana de que a un cliente lo estás por perder.

**Por dónde.** Dos columnas nuevas en la tabla de `/admin`: clicks del mes
actual y variación contra el mes anterior, con color según el signo. Se
calcula con dos `count` acotados por fecha — conviene resolverlo junto con el
punto 8, en una sola consulta.

---

## Importante, sin apuro

### 4. El límite de intentos de login no aguanta nada

**Hoy.** `src/lib/ratelimit.ts` guarda los intentos en un `Map` en memoria.

**Por qué importa.** En Vercel cada instancia tiene su propia memoria y se
reciclan seguido, así que el tope de 8 intentos por IP se saltea sin mucho
esfuerzo. La contraseña de `/admin` controla el destino de **todas** las
tarjetas: quien entre puede apuntarlas a donde quiera, y el local ni se entera.
El riesgo no es que se filtren datos, es que se secuestren las redirecciones.

**Por dónde.** Tabla `intentos_login (clave, intentos, hasta)` en Postgres y
mover la lógica ahí; el módulo actual ya tiene la interfaz correcta
(`permitirIntento` / `limpiarIntentos`), así que el cambio queda contenido.
Alternativa si aparece presupuesto: un KV tipo Upstash.

### 5. Los escaneos repetidos cuentan doble

**Hoy.** Cada visita a `/r/<slug>` inserta un click. La misma persona apoyando
el teléfono tres veces son tres clicks.

**Por qué importa.** Infla el número que se le muestra al local. Ayuda a
vender el primer mes y erosiona la confianza al sexto, cuando el local compara
los escaneos con las reseñas que realmente le entraron.

**Por dónde.** Hoy no se guarda nada que permita distinguir visitantes. Habría
que agregar una columna con un hash de IP + user agent (hash, no el dato en
crudo) y descartar repeticiones del mismo hash dentro de una ventana corta,
por ejemplo 30 minutos. Ojo con el impacto en la latencia de la redirección:
la consulta de deduplicación no debería bloquear el `redirect`.

### 6. La pantalla de tarjeta no configurada es un 404 seco

**Hoy.** `/r/<slug>` inexistente llama a `notFound()` y muestra *"Página no
encontrada"*.

**Por qué importa.** Quien lee ese cartel no es un desarrollador: es el cliente
del local, con el teléfono en la mano y a tres segundos de irse. Es lenguaje
equivocado para esa audiencia.

**Por dónde.** Una pantalla propia en `src/app/r/[slug]/not-found.tsx` con el
mismo diseño que la de servicio suspendido: *"Esta tarjeta todavía no está
activa."* Sin jerga y sin números de error.

### 7. No hay forma de exportar ni respaldar

**Hoy.** Los clientes y todo el historial de clicks viven solo en Supabase.

**Por qué importa.** Si el proyecto se pausa, se borra o se pierde el acceso,
se va todo: los locales, los slugs y las estadísticas que justifican la cuota.
No hay copia en ningún lado.

**Por dónde.** Un botón en `/admin` que baje un CSV de clientes y otro de
clicks. Es la versión mínima y alcanza. Aparte, dejar anotado cómo sacar un
backup desde el panel de Supabase.

### 8. El panel hace una consulta por cliente

**Hoy.** `listarClientesConClicks()` en `src/lib/data.ts` trae los clientes y
después dispara un `count` por cada uno, en paralelo.

**Por qué importa.** Con 5 locales no se nota, con 50 se empieza a sentir y con
200 el panel se vuelve lento. Es un techo conocido, no un problema actual.

**Por dónde.** Una vista o función SQL que devuelva clientes y totales en una
sola consulta. Es el momento natural para agregar también los totales por mes
del punto 3.

---

## Anotado, sin plan

- **Next.js 14 tiene un aviso de seguridad abierto** que abarca todas las 14.x
  y 15.x; la primera versión limpia es la 16.3.2. Está explicado en el README,
  sección *Seguridad*. La migración es viable (Next 16 sigue teniendo app
  router) pero es un salto de dos versiones mayores.

- **No se mide la conversión real.** Se sabe cuánta gente escaneó, no cuánta
  dejó la reseña. Google no lo expone, así que la única forma sería que el
  local cargue a mano su cantidad de reseñas cada tanto y comparar. Puede que
  no valga la pena.

- **Recuperar la contraseña de un local.** Está hasheada, así que no se puede
  mostrar: solo regenerarla, y eso invalida la anterior. Es lo correcto en
  términos de seguridad. Si molesta en la práctica, la salida no es guardar la
  contraseña sino permitir que el local se la cambie él mismo.
