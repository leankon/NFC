-- =====================================================================
--  NFC Redirect  ·  Esquema de base de datos (Supabase / PostgreSQL)
--  Ejecutar completo en:  Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabla: clientes
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  nombre_local  text not null,
  redirect_url  text not null,
  activo        boolean not null default true,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create index if not exists clientes_slug_idx on public.clientes (slug);

-- ---------------------------------------------------------------------
-- Tabla: clicks
--   hora        -> 0..23   (hora local del negocio, ver APP_TIMEZONE)
--   dia_semana  -> 0..6    (0 = domingo ... 6 = sábado)
-- ---------------------------------------------------------------------
create table if not exists public.clicks (
  id         bigserial primary key,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  timestamp  timestamptz not null default now(),
  hora       smallint not null check (hora between 0 and 23),
  dia_semana smallint not null check (dia_semana between 0 and 6)
);

create index if not exists clicks_cliente_id_idx on public.clicks (cliente_id);
create index if not exists clicks_timestamp_idx  on public.clicks ("timestamp" desc);
create index if not exists clicks_cliente_ts_idx on public.clicks (cliente_id, "timestamp" desc);

-- ---------------------------------------------------------------------
-- Row Level Security
--   La app entera corre en el servidor con la SERVICE ROLE KEY, que
--   ignora RLS. Dejamos RLS activo y sin políticas públicas para que
--   nadie pueda leer/escribir con la anon key.
-- ---------------------------------------------------------------------
alter table public.clientes enable row level security;
alter table public.clicks   enable row level security;

drop policy if exists "clientes sin acceso publico" on public.clientes;
drop policy if exists "clicks sin acceso publico"   on public.clicks;
