-- Stock de la tienda online: descuenta solo al entrar un pedido de la tienda
-- (y lo devuelve si el pedido se anula). Correr UNA vez en Supabase > SQL Editor.

-- 1) Producto del stock al que corresponde cada producto de la tienda.
--    Si queda vacío, se busca un producto del stock con el MISMO nombre.
alter table productos_catalogo add column if not exists stock_producto text;
alter table pedidos_distribuidora add column if not exists stock_descontado jsonb;

-- 2) Convierte los productos de un pedido de tienda en [{producto, cantidad}] del stock.
--    "Nombre (Pack x3)" x 2 packs  ->  6 unidades de "Nombre" (o de su equivalente).
create or replace function tienda_items_stock(p_productos jsonb)
returns table(producto text, cantidad numeric)
language sql stable security definer set search_path = public as $$
  with it as (
    select
      trim(regexp_replace(e->>'producto', '\s*\(Pack x\d+\)\s*$', '')) as base,
      coalesce(nullif((regexp_match(e->>'producto', '\(Pack x(\d+)\)'))[1], '')::numeric, 1)
        * coalesce((e->>'cantidad')::numeric, 1) as unidades
    from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb)) e
    where (e->>'producto') not ilike 'Envío%'
  ),
  m as (
    select coalesce(
      (select nullif(trim(c.stock_producto), '') from productos_catalogo c
        where c.negocio = 'tienda' and lower(c.nombre) = lower(it.base) limit 1),
      (select s.producto from stock_productos s where lower(s.producto) = lower(it.base) limit 1)
    ) as prod, it.unidades
    from it
  )
  select prod, sum(unidades) from m where prod is not null group by prod;
$$;

-- 3) Pedido nuevo de la tienda: descuenta.
create or replace function tienda_descontar_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; lista jsonb := '[]'::jsonb;
begin
  if new.canal is distinct from 'tienda' then return new; end if;
  for r in select * from tienda_items_stock(new.productos) loop
    if not exists (select 1 from stock_productos where producto = r.producto) then
      insert into stock_productos(producto, cantidad) values (r.producto, 0);
    end if;
    update stock_productos set cantidad = greatest(0, cantidad - r.cantidad) where producto = r.producto;
    insert into movimientos_stock(producto, tipo, cantidad, motivo)
      values (r.producto, 'salida', r.cantidad, 'Tienda online — ' || coalesce(new.comercio, ''));
    lista := lista || jsonb_build_object('producto', r.producto, 'cantidad', r.cantidad);
  end loop;
  update pedidos_distribuidora set stock_descontado = lista where id = new.id;
  return new;
end $$;

drop trigger if exists trg_tienda_descontar_stock on pedidos_distribuidora;
create trigger trg_tienda_descontar_stock after insert on pedidos_distribuidora
  for each row execute function tienda_descontar_stock();

-- 4) Pedido de la tienda anulado: devuelve lo que se descontó.
create or replace function tienda_reponer_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if new.canal = 'tienda' and coalesce(new.anulado, false) and not coalesce(old.anulado, false)
     and new.stock_descontado is not null then
    for r in select * from jsonb_array_elements(new.stock_descontado) loop
      update stock_productos set cantidad = cantidad + (r->>'cantidad')::numeric where producto = r->>'producto';
      insert into movimientos_stock(producto, tipo, cantidad, motivo)
        values (r->>'producto', 'entrada', (r->>'cantidad')::numeric, 'Pedido de tienda anulado — ' || coalesce(new.comercio, ''));
    end loop;
    update pedidos_distribuidora set stock_descontado = null where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_tienda_reponer_stock on pedidos_distribuidora;
create trigger trg_tienda_reponer_stock after update of anulado on pedidos_distribuidora
  for each row execute function tienda_reponer_stock();

-- 5) Para revisar: productos de la tienda y si encuentran su producto del stock.
--    Los que digan "SIN STOCK ASOCIADO" no descuentan: cargales el producto en Productos.
select c.nombre as producto_tienda,
       coalesce(nullif(trim(c.stock_producto),''), (select s.producto from stock_productos s where lower(s.producto)=lower(c.nombre) limit 1), 'SIN STOCK ASOCIADO') as producto_del_stock
from productos_catalogo c where c.negocio='tienda' and c.activo order by 2 desc, 1;
