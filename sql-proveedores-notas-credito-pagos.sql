-- Facturas de proveedor v2: notas de crédito asociadas, punto de venta / número, vencimiento
-- y pago con imputación automática a las facturas más antiguas.
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
--
-- Cómo se guardan las notas de crédito: son filas de facturas_proveedor con tipo_comprobante
-- "Nota de Crédito A/B/C" e importe NEGATIVO (con items, IVA y percepciones también negativos).
-- Así la cuenta corriente, el dashboard y el Libro IVA Compras las restan sin cambios.

alter table facturas_proveedor add column if not exists punto_venta text;
alter table facturas_proveedor add column if not exists numero text;
alter table facturas_proveedor add column if not exists fecha_vencimiento date;
alter table facturas_proveedor add column if not exists factura_asociada_id bigint;
alter table facturas_proveedor add column if not exists nc_motivo text;
alter table facturas_proveedor add column if not exists nc_afecta_stock boolean not null default false;
create index if not exists fp_asociada_idx on facturas_proveedor (factura_asociada_id);

-- Marca como pagada (o no) una factura según lo pagado + lo cubierto por notas de crédito.
create or replace function recalcular_factura_proveedor(p_id bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
declare f record; v_nc numeric;
begin
  select * into f from facturas_proveedor where id = p_id for update;
  if not found then return; end if;
  if f.importe <= 0 then return; end if;  -- las notas de crédito no se "pagan"
  select coalesce(-sum(importe), 0) into v_nc from facturas_proveedor where factura_asociada_id = p_id;
  update facturas_proveedor
     set pagada = (coalesce(pagado_monto, 0) + v_nc >= importe - 0.005),
         fecha_pago = case
           when coalesce(pagado_monto, 0) + v_nc >= importe - 0.005 then coalesce(fecha_pago, current_date)
           else null end
   where id = p_id;
end;
$$;

-- Asocia una nota de crédito a una factura (o la desasocia con p_factura = null).
create or replace function asociar_nota_credito(p_nc bigint, p_factura bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
declare n record; f record; v_viejo bigint;
begin
  select * into n from facturas_proveedor where id = p_nc for update;
  if not found or n.importe >= 0 then raise exception 'El comprobante % no es una nota de crédito', p_nc; end if;
  v_viejo := n.factura_asociada_id;
  if p_factura is not null then
    select * into f from facturas_proveedor where id = p_factura;
    if not found or f.importe <= 0 then raise exception 'La factura a asociar no existe'; end if;
    if lower(trim(f.proveedor)) is distinct from lower(trim(n.proveedor)) then
      raise exception 'La factura es de otro proveedor';
    end if;
  end if;
  update facturas_proveedor set factura_asociada_id = p_factura where id = p_nc;
  if v_viejo is not null then perform recalcular_factura_proveedor(v_viejo); end if;
  if p_factura is not null then perform recalcular_factura_proveedor(p_factura); end if;
end;
$$;

-- Orden de pago v2: ahora descuenta lo cubierto por notas de crédito y admite "a cuenta"
-- (el excedente que no se imputa a ninguna factura queda como saldo a favor).
drop function if exists generar_orden_pago(text, date, text, text, text, jsonb);
create or replace function generar_orden_pago(
  p_proveedor text, p_fecha date, p_medio text, p_referencia text, p_nota text, p_items jsonb,
  p_a_cuenta numeric default 0
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb; f record; v_monto numeric; v_total numeric := 0; v_pago bigint; v_nc numeric;
  v_ac numeric := coalesce(p_a_cuenta, 0);
begin
  if (p_items is null or jsonb_array_length(p_items) = 0) and v_ac <= 0 then
    raise exception 'Elegí al menos una factura';
  end if;
  if v_ac < 0 then raise exception 'El monto a cuenta no puede ser negativo'; end if;
  if coalesce(p_medio, '') = '' then
    raise exception 'Elegí el medio de pago';
  end if;

  if p_items is not null then
    for it in select * from jsonb_array_elements(p_items) loop
      select * into f from facturas_proveedor where id = (it->>'factura_id')::bigint for update;
      if not found then raise exception 'La factura % no existe', it->>'factura_id'; end if;
      if lower(trim(f.proveedor)) is distinct from lower(trim(p_proveedor)) then
        raise exception 'La factura % es de otro proveedor', f.id;
      end if;
      if f.importe <= 0 then raise exception 'El comprobante % no se puede pagar', f.id; end if;
      select coalesce(-sum(importe), 0) into v_nc from facturas_proveedor where factura_asociada_id = f.id;
      v_monto := (it->>'monto')::numeric;
      if v_monto is null or v_monto <= 0 then raise exception 'Monto inválido en la factura %', f.id; end if;
      if v_monto > (f.importe - coalesce(f.pagado_monto, 0) - v_nc) + 0.005 then
        raise exception 'El monto supera el saldo de la factura %', f.id;
      end if;
      v_total := v_total + v_monto;
    end loop;
  end if;

  insert into pagos_proveedor (proveedor, monto, fecha, nota, medio, referencia)
  values (p_proveedor, v_total + v_ac, p_fecha, nullif(p_nota, ''), p_medio, nullif(p_referencia, ''))
  returning id into v_pago;

  if p_items is not null then
    for it in select * from jsonb_array_elements(p_items) loop
      v_monto := (it->>'monto')::numeric;
      insert into pagos_proveedor_facturas (pago_id, factura_id, monto)
      values (v_pago, (it->>'factura_id')::bigint, v_monto);
      update facturas_proveedor
         set pagado_monto = coalesce(pagado_monto, 0) + v_monto
       where id = (it->>'factura_id')::bigint;
      perform recalcular_factura_proveedor((it->>'factura_id')::bigint);
      update facturas_proveedor set fecha_pago = p_fecha
       where id = (it->>'factura_id')::bigint and pagada;
    end loop;
  end if;

  return v_pago;
end;
$$;

-- Anular una orden de pago: devuelve lo imputado a cada factura (respetando las notas de crédito).
create or replace function anular_orden_pago(p_pago bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
declare l record;
begin
  if not exists (select 1 from pagos_proveedor where id = p_pago and not anulado) then
    raise exception 'La orden de pago no existe o ya está anulada';
  end if;
  for l in select * from pagos_proveedor_facturas where pago_id = p_pago loop
    update facturas_proveedor
       set pagado_monto = greatest(0, coalesce(pagado_monto, 0) - l.monto)
     where id = l.factura_id;
    perform recalcular_factura_proveedor(l.factura_id);
  end loop;
  update pagos_proveedor set anulado = true, anulado_en = now() where id = p_pago;
end;
$$;

revoke all on function recalcular_factura_proveedor(bigint) from public, anon;
grant execute on function recalcular_factura_proveedor(bigint) to authenticated;
revoke all on function asociar_nota_credito(bigint, bigint) from public, anon;
grant execute on function asociar_nota_credito(bigint, bigint) to authenticated;
revoke all on function generar_orden_pago(text, date, text, text, text, jsonb, numeric) from public, anon;
grant execute on function generar_orden_pago(text, date, text, text, text, jsonb, numeric) to authenticated;
revoke all on function anular_orden_pago(bigint) from public, anon;
grant execute on function anular_orden_pago(bigint) to authenticated;
