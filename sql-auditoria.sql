-- Auditoría: registra quién hizo cada acción en el panel admin (estado, pago,
-- descuentos, envíos, facturación, impresiones, borrados). Correr UNA VEZ en
-- Supabase → SQL Editor → Run. Es seguro de volver a correr.
--
-- Es "solo agregar": no hay políticas de UPDATE ni DELETE, así que nadie
-- (ni siquiera un usuario admin) puede editar o borrar un evento ya guardado.
-- El usuario se toma del login (auth.jwt), no del navegador, así que no se
-- puede falsificar.

create table if not exists auditoria_eventos (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  usuario_email text not null default coalesce(auth.jwt() ->> 'email', 'desconocido'),
  pedido_id bigint,
  evento text not null,
  detalle text
);

create index if not exists auditoria_pedido_idx on auditoria_eventos (pedido_id, creado_en desc);
create index if not exists auditoria_fecha_idx on auditoria_eventos (creado_en desc);
create index if not exists auditoria_evento_idx on auditoria_eventos (evento);

alter table auditoria_eventos enable row level security;

drop policy if exists "Auditoria insertar" on auditoria_eventos;
create policy "Auditoria insertar" on auditoria_eventos
  for insert
  to authenticated
  with check (usuario_email = coalesce(auth.jwt() ->> 'email', ''));

drop policy if exists "Auditoria ver" on auditoria_eventos;
create policy "Auditoria ver" on auditoria_eventos
  for select
  to authenticated
  using (true);
