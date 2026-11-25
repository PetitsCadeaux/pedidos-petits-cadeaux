-- Permite elegir la fecha del remito (compromiso de pago, no fiscal) al generarlo.
-- Correr UNA VEZ en Supabase -> SQL Editor -> Run. Es seguro de volver a correr.
-- Si no se indica fecha, usa el momento actual como hasta ahora.
drop function if exists asignar_remito(bigint);

create or replace function asignar_remito(p_pedido bigint, p_fecha date default null)
returns table(remito_pto_vta int, remito_nro bigint, remito_en timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update pedidos_distribuidora p
     set remito_pto_vta = 1,
         remito_nro = nextval('remito_seq'),
         remito_en = case
           when p_fecha is null then now()
           else ((p_fecha + time '12:00')::timestamp at time zone 'America/Argentina/Buenos_Aires')
         end,
         remito_total = p.total
   where p.id = p_pedido and p.remito_nro is null;

  return query
    select p.remito_pto_vta, p.remito_nro, p.remito_en
      from pedidos_distribuidora p
     where p.id = p_pedido;
end;
$$;

revoke all on function asignar_remito(bigint, date) from public, anon;
grant execute on function asignar_remito(bigint, date) to authenticated;

-- Cambiar la fecha de un remito ya generado (solo remitos, no facturas)
create or replace function cambiar_fecha_remito(p_pedido bigint, p_fecha date)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare v timestamptz;
begin
  update pedidos_distribuidora p
     set remito_en = ((p_fecha + time '12:00')::timestamp at time zone 'America/Argentina/Buenos_Aires')
   where p.id = p_pedido and p.remito_nro is not null and p.factura_cae is null
  returning p.remito_en into v;
  return v;
end;
$$;
revoke all on function cambiar_fecha_remito(bigint, date) from public, anon;
grant execute on function cambiar_fecha_remito(bigint, date) to authenticated;
