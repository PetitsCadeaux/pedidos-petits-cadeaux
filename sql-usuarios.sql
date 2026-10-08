-- Usuarios y permisos del panel admin. Correr UNA VEZ en Supabase → SQL Editor → Run.
-- Es seguro de volver a correr.
--
-- Solo se puede LEER desde el navegador (cada persona ve su propia fila y el
-- administrador general ve todas). Crear, editar o desactivar usuarios solo lo
-- hace el servidor (api/admin-usuarios.js) con la clave de servicio, después de
-- comprobar que quien pide es administrador general.

create table if not exists usuarios_admin (
  email text primary key,
  user_id uuid,
  nombre text,
  rol text not null default 'equipo',          -- 'admin' (administración general) o 'equipo'
  permisos jsonb not null default '[]'::jsonb,  -- lista de permisos (solo para rol 'equipo')
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por text
);

alter table usuarios_admin enable row level security;

drop policy if exists "Usuarios ver propio o admin" on usuarios_admin;
create policy "Usuarios ver propio o admin" on usuarios_admin
  for select
  to authenticated
  using (
    email = coalesce(auth.jwt() ->> 'email', '')
    or exists (
      select 1 from usuarios_admin a
      where a.email = coalesce(auth.jwt() ->> 'email', '') and a.rol = 'admin' and a.activo
    )
  );
-- Sin políticas de INSERT/UPDATE/DELETE: nadie puede tocarla desde el navegador.

-- Nombre de usuario (para ingresar) y email de contacto opcional. Correr también esto.
alter table usuarios_admin add column if not exists usuario text;
alter table usuarios_admin add column if not exists email_contacto text;
