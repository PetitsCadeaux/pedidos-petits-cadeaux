-- Tabla para contar visitas a las páginas públicas (tienda, regaleria,
-- index) y poder verlas en admin/visitas.html. Correr UNA VEZ en Supabase
-- → SQL Editor → Run. Es seguro de volver a correr (usa "if not exists").

create table if not exists visitas (
  id bigint generated always as identity primary key,
  pagina text not null check (pagina in ('tienda','regaleria','index')),
  creado_en timestamptz not null default now()
);

create index if not exists visitas_creado_en_idx on visitas (creado_en);
create index if not exists visitas_pagina_idx on visitas (pagina);

alter table visitas enable row level security;

-- Cualquier visitante (sin login) puede registrar su propia visita.
drop policy if exists "Insertar visita publica" on visitas;
create policy "Insertar visita publica" on visitas
  for insert
  to anon, authenticated
  with check (true);

-- Solo el admin logueado puede ver las estadísticas.
drop policy if exists "Ver visitas solo admin" on visitas;
create policy "Ver visitas solo admin" on visitas
  for select
  to authenticated
  using (true);
