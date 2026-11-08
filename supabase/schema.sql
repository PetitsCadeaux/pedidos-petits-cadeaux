-- =====================================================================
-- panel-produccion · Esquema base (Supabase / PostgreSQL)
-- Multiempresa desde el día uno: todas las tablas llevan empresa_id + RLS
-- Ejecutar completo en el SQL Editor de Supabase.
-- =====================================================================

-- ---------- 1. Empresas y usuarios ----------
create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuit text,
  creada_en timestamptz not null default now()
);

create table if not exists perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id),
  nombre text,
  rol text not null default 'operario'
    check (rol in ('admin','supervisor','operario','lector'))
);

-- Empresa del usuario logueado (la usan todas las políticas RLS)
create or replace function empresa_actual() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from perfiles where user_id = auth.uid()
$$;

-- "Hoy" en la zona horaria de la empresa (Supabase corre en UTC; sin esto, el día cambia a las 21:00 en Argentina)
create or replace function hoy_local() returns date
language sql stable as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date
$$;

-- ---------- 2. Estructura física ----------
create table if not exists plantas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nombre text not null,                       -- Peña, Saraza
  lat numeric, lng numeric,                   -- referencia para sugerir ubicación
  activa boolean not null default true,
  unique (empresa_id, nombre)
);

create table if not exists sectores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  planta_id uuid not null references plantas(id),
  nombre text not null,                       -- Amasado, Horno, Desmolde, Empaque
  unique (planta_id, nombre)
);

-- ---------- 2b. Empleados (catálogo común: producción, RRHH, recibos) ----------
create table if not exists empleados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  user_id uuid references auth.users(id),     -- si el empleado tiene usuario en el sistema
  legajo text,
  nombre text not null,
  documento text,
  cuil text,
  razon_social text,                          -- por si hay más de un CUIT dentro de la empresa
  planta_id uuid references plantas(id),      -- planta habitual (puede rotar)
  puesto text,
  fecha_ingreso date,
  activo boolean not null default true,
  unique (empresa_id, legajo)
);

-- ---------- 3. Catálogo único (productos e insumos) ----------
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  codigo text,
  nombre text not null,
  familia text,                               -- ej: Pan de hamburguesa
  variante text,                              -- ej: con sésamo, 4 unidades
  unidad text not null default 'unidad',
  activo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nombre text not null,
  tipo text not null default 'materia_prima'
    check (tipo in ('materia_prima','embalaje','otro')),
  unidad text not null default 'kg',          -- kg, g, l, unidad
  stock_minimo numeric not null default 0,
  activo boolean not null default true,
  unique (empresa_id, nombre)
);

-- ---------- 4. Recetas ----------
create table if not exists recetas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  producto_id uuid not null references productos(id),
  version int not null default 1,
  rendimiento numeric not null check (rendimiento > 0), -- unidades que salen del lote base
  merma_esperada_pct numeric not null default 0,
  activa boolean not null default true,
  unique (producto_id, version)
);

create table if not exists receta_items (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  receta_id uuid not null references recetas(id) on delete cascade,
  insumo_id uuid not null references insumos(id),
  cantidad numeric not null check (cantidad > 0), -- por lote base, en unidad del insumo
  unique (receta_id, insumo_id)
);

-- ---------- 5. Etapas de producción (configurables por empresa) ----------
create table if not exists etapas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nombre text not null,                       -- Producción, Horno, Desmolde, Empaquetado
  orden int not null,
  descuenta_insumos boolean not null default false, -- al registrar esta etapa se descuenta materia prima
  ingresa_stock boolean not null default false,     -- al registrar esta etapa entra producto terminado
  unique (empresa_id, nombre),
  unique (empresa_id, orden)
);

-- ---------- 6. Órdenes y registro paso a paso ----------
create table if not exists ordenes_produccion (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  planta_id uuid not null references plantas(id),
  producto_id uuid not null references productos(id),
  receta_id uuid references recetas(id),
  cantidad_objetivo numeric not null check (cantidad_objetivo > 0),
  lote text,
  estado text not null default 'en_curso'
    check (estado in ('planificada','en_curso','finalizada','cancelada')),
  fecha date not null default hoy_local(),
  creada_por uuid references auth.users(id),
  creada_en timestamptz not null default now()
);

create table if not exists registros_etapa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  orden_id uuid not null references ordenes_produccion(id) on delete cascade,
  etapa_id uuid not null references etapas(id),
  planta_id uuid not null references plantas(id),   -- dónde se hizo REALMENTE (lo confirma la persona)
  sector_id uuid references sectores(id),
  cantidad_entrada numeric not null check (cantidad_entrada >= 0),
  cantidad_salida numeric not null check (cantidad_salida >= 0),
  merma numeric generated always as (cantidad_entrada - cantidad_salida) stored,
  inicio timestamptz not null default now(),
  fin timestamptz,
  usuario_id uuid references auth.users(id),
  empleado_id uuid references empleados(id),        -- quién hizo el trabajo (base para costo de mano de obra)
  -- ubicación: solo como respaldo/sugerencia, nunca decide la planta
  lat numeric, lng numeric,
  ubicacion_confirmada boolean not null default false,
  observaciones text,
  creado_en timestamptz not null default now()
);
create index if not exists idx_reg_orden on registros_etapa(orden_id);
create index if not exists idx_reg_empresa_fecha on registros_etapa(empresa_id, creado_en desc);

-- Paradas de planta (para el panel: minutos parados hoy)
create table if not exists paradas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  planta_id uuid not null references plantas(id),
  sector_id uuid references sectores(id),
  motivo text,
  inicio timestamptz not null default now(),
  fin timestamptz,
  usuario_id uuid references auth.users(id)
);

-- ---------- 7. Stock (siempre por movimientos) ----------
create table if not exists movimientos_insumo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  insumo_id uuid not null references insumos(id),
  planta_id uuid references plantas(id),
  tipo text not null check (tipo in ('compra','consumo','ajuste','transferencia')),
  cantidad numeric not null,                  -- positivo entra, negativo sale
  orden_id uuid references ordenes_produccion(id),
  registro_id uuid references registros_etapa(id),
  motivo text,
  creado_en timestamptz not null default now()
);

create table if not exists movimientos_producto (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  producto_id uuid not null references productos(id),
  planta_id uuid references plantas(id),
  tipo text not null check (tipo in ('produccion','venta','ajuste','transferencia')),
  cantidad numeric not null,
  orden_id uuid references ordenes_produccion(id),
  registro_id uuid references registros_etapa(id),
  motivo text,
  creado_en timestamptz not null default now()
);

-- ---------- 8. Automatismo: receta -> stock ----------
create or replace function aplicar_registro_etapa() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_etapa etapas%rowtype;
  v_orden ordenes_produccion%rowtype;
  v_rend numeric;
begin
  select * into v_etapa from etapas where id = new.etapa_id;
  select * into v_orden from ordenes_produccion where id = new.orden_id;

  -- Descuento de materia prima según receta
  if v_etapa.descuenta_insumos and v_orden.receta_id is not null then
    select rendimiento into v_rend from recetas where id = v_orden.receta_id;
    insert into movimientos_insumo (empresa_id, insumo_id, planta_id, tipo, cantidad, orden_id, registro_id, motivo)
    select new.empresa_id, ri.insumo_id, new.planta_id, 'consumo',
           -1 * ri.cantidad * (new.cantidad_entrada / v_rend),
           new.orden_id, new.id, 'Consumo por receta'
    from receta_items ri
    where ri.receta_id = v_orden.receta_id;
  end if;

  -- Ingreso de producto terminado
  if v_etapa.ingresa_stock then
    insert into movimientos_producto (empresa_id, producto_id, planta_id, tipo, cantidad, orden_id, registro_id, motivo)
    values (new.empresa_id, v_orden.producto_id, new.planta_id, 'produccion',
            new.cantidad_salida, new.orden_id, new.id, 'Producción empaquetada');
  end if;

  return new;
end $$;

drop trigger if exists trg_registro_etapa on registros_etapa;
create trigger trg_registro_etapa
after insert on registros_etapa
for each row execute function aplicar_registro_etapa();

-- ---------- 9. Vistas para el panel ----------
create or replace view v_stock_insumos as
select i.empresa_id, i.id as insumo_id, i.nombre, i.tipo, i.unidad, i.stock_minimo,
       coalesce(sum(m.cantidad),0) as stock_actual,
       coalesce(sum(m.cantidad),0) < i.stock_minimo as bajo_minimo
from insumos i
left join movimientos_insumo m on m.insumo_id = i.id
group by i.empresa_id, i.id;

create or replace view v_stock_productos as
select p.empresa_id, p.id as producto_id, p.nombre, p.familia, p.variante,
       coalesce(sum(m.cantidad),0) as stock_actual
from productos p
left join movimientos_producto m on m.producto_id = p.id
group by p.empresa_id, p.id;

-- Producción de hoy por planta y etapa (corazón del panel "en vivo")
-- (drop primero: si ya habías corrido una versión anterior, cambian las columnas)
drop view if exists v_produccion_hoy;
create view v_produccion_hoy as
select r.empresa_id, pl.nombre as planta, e.nombre as etapa, e.orden,
       e.ingresa_stock, e.descuenta_insumos,
       p.familia, p.nombre as producto,
       sum(r.cantidad_entrada) as entrada,
       sum(r.cantidad_salida)  as salida,
       sum(r.merma)            as merma,
       round(100 * sum(r.merma) / nullif(sum(r.cantidad_entrada),0), 2) as merma_pct,
       round((avg(extract(epoch from (r.fin - r.inicio)) / 60)
              filter (where r.fin is not null))::numeric, 1) as min_prom
from registros_etapa r
join etapas e on e.id = r.etapa_id
join plantas pl on pl.id = r.planta_id
join ordenes_produccion o on o.id = r.orden_id
join productos p on p.id = o.producto_id
where (r.creado_en at time zone 'America/Argentina/Buenos_Aires')::date = hoy_local()
group by r.empresa_id, pl.nombre, e.nombre, e.orden, e.ingresa_stock, e.descuenta_insumos, p.familia, p.nombre;

-- Empaquetado por hora y planta (gráfico del panel)
create or replace view v_produccion_hora as
select r.empresa_id, pl.nombre as planta,
       extract(hour from (r.creado_en at time zone 'America/Argentina/Buenos_Aires'))::int as hora,
       sum(r.cantidad_salida) as empaquetado
from registros_etapa r
join etapas e on e.id = r.etapa_id
join plantas pl on pl.id = r.planta_id
where e.ingresa_stock
  and (r.creado_en at time zone 'America/Argentina/Buenos_Aires')::date = hoy_local()
group by r.empresa_id, pl.nombre, 3;

-- Últimos registros cargados (lista "Últimos registros")
create or replace view v_ultimos_registros as
select r.empresa_id, r.id, r.creado_en, pl.nombre as planta, e.nombre as etapa,
       r.cantidad_entrada, r.cantidad_salida, r.merma, o.lote
from registros_etapa r
join etapas e on e.id = r.etapa_id
join plantas pl on pl.id = r.planta_id
join ordenes_produccion o on o.id = r.orden_id
order by r.creado_en desc
limit 50;

-- Paradas de hoy
create or replace view v_paradas_hoy as
select p.empresa_id, pl.nombre as planta, p.motivo, p.inicio,
       coalesce(p.fin, now()) as fin,
       extract(epoch from (coalesce(p.fin, now()) - p.inicio)) / 60 as minutos
from paradas p
join plantas pl on pl.id = p.planta_id
where (p.inicio at time zone 'America/Argentina/Buenos_Aires')::date = hoy_local();

-- Avance de cada orden vs objetivo
create or replace view v_avance_ordenes as
select o.empresa_id, o.id as orden_id, o.lote, o.fecha, pl.nombre as planta,
       p.nombre as producto, o.cantidad_objetivo, o.estado,
       coalesce(sum(r.cantidad_salida) filter (where e.ingresa_stock),0) as empaquetado,
       round(100 * coalesce(sum(r.cantidad_salida) filter (where e.ingresa_stock),0)
             / o.cantidad_objetivo, 1) as avance_pct
from ordenes_produccion o
join plantas pl on pl.id = o.planta_id
join productos p on p.id = o.producto_id
left join registros_etapa r on r.orden_id = o.id
left join etapas e on e.id = r.etapa_id
group by o.id, pl.nombre, p.nombre;

alter view v_stock_insumos set (security_invoker = true);
alter view v_stock_productos set (security_invoker = true);
alter view v_produccion_hoy set (security_invoker = true);
alter view v_avance_ordenes set (security_invoker = true);
alter view v_produccion_hora set (security_invoker = true);
alter view v_ultimos_registros set (security_invoker = true);
alter view v_paradas_hoy set (security_invoker = true);

-- ---------- 10. Seguridad (RLS por empresa) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'plantas','sectores','empleados','productos','insumos','recetas','receta_items',
    'etapas','ordenes_produccion','registros_etapa','paradas',
    'movimientos_insumo','movimientos_producto'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "empresa_acceso" on %I', t);
    execute format(
      'create policy "empresa_acceso" on %I for all to authenticated
       using (empresa_id = empresa_actual()) with check (empresa_id = empresa_actual())', t);
  end loop;
end $$;

alter table empresas enable row level security;
drop policy if exists "ver_mi_empresa" on empresas;
create policy "ver_mi_empresa" on empresas for select to authenticated
  using (id = empresa_actual());

alter table perfiles enable row level security;
drop policy if exists "ver_mi_perfil" on perfiles;
create policy "ver_mi_perfil" on perfiles for select to authenticated
  using (user_id = auth.uid() or empresa_id = empresa_actual());

-- ---------- 11. Tiempo real para el panel ----------
do $$
declare t text;
begin
  foreach t in array array['registros_etapa','movimientos_producto','movimientos_insumo','paradas','ordenes_produccion'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- 12. Datos de ejemplo (opcional, editar y ejecutar a mano) ----------
-- insert into empresas (nombre) values ('Pazzi') returning id;
-- Con ese id: crear plantas (Peña, Saraza), sectores, etapas:
--   Producción (orden 1, descuenta_insumos = true)
--   Horno      (orden 2)
--   Desmolde   (orden 3)
--   Empaquetado(orden 4, ingresa_stock = true)
-- Luego un perfil que vincule tu usuario de auth con la empresa.
