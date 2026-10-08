-- Facturación: remitos manuales (compromiso de pago) con numeración propia.
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
--
-- Cada pedido puede tener:
--   * un remito (remito_pto_vta + remito_nro, numeración propia, NO fiscal), y/o
--   * una factura ARCA (factura_cae, ya existente).
-- La cobranza sigue usando estado_pago / fecha_pago (ahora se gestiona desde Facturación).

alter table pedidos_distribuidora add column if not exists remito_pto_vta int;
alter table pedidos_distribuidora add column if not exists remito_nro bigint;
alter table pedidos_distribuidora add column if not exists remito_en timestamptz;
alter table pedidos_distribuidora add column if not exists remito_total numeric;

-- Numeración correlativa de remitos (0001-00000001, 0001-00000002, ...).
create sequence if not exists remito_seq start 1;

-- Asigna el próximo número de remito de forma atómica (dos personas a la vez no
-- pueden obtener el mismo número). Si el pedido ya tiene remito, lo devuelve igual.
create or replace function asignar_remito(p_pedido bigint)
returns table(remito_pto_vta int, remito_nro bigint, remito_en timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update pedidos_distribuidora p
     set remito_pto_vta = 1,
         remito_nro = nextval('remito_seq'),
         remito_en = now(),
         remito_total = p.total
   where p.id = p_pedido and p.remito_nro is null;

  return query
    select p.remito_pto_vta, p.remito_nro, p.remito_en
      from pedidos_distribuidora p
     where p.id = p_pedido;
end;
$$;

revoke all on function asignar_remito(bigint) from public, anon;
grant execute on function asignar_remito(bigint) to authenticated;

-- Si ya venías haciendo remitos en otro sistema y querés seguir su numeración,
-- por ejemplo desde el 1500, corré:  select setval('remito_seq', 1499);
