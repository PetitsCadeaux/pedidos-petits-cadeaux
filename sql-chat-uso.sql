-- Medidor de gasto del asistente de pedidos (chat). Correr UNA VEZ en
-- Supabase → SQL Editor → Run. Seguro de volver a correr.
-- Solo lo usa el servidor (clave de servicio); el público no lo puede leer.
create table if not exists chat_uso (
  mes text primary key,            -- ej. 2026-11
  costo_usd numeric not null default 0,
  mensajes integer not null default 0,
  pedidos integer not null default 0,
  actualizado timestamptz not null default now()
);
alter table chat_uso enable row level security;
drop policy if exists "Admin ve uso del chat" on chat_uso;
create policy "Admin ve uso del chat" on chat_uso for select to authenticated using (true);
