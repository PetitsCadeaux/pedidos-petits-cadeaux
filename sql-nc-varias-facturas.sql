-- Aplicar UNA nota de crédito a VARIAS facturas / remitos (reparto parcial).
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
-- Requiere haber corrido antes sql-proveedores-notas-credito-pagos.sql y sql-ordenes-pago.sql.
--
-- La nota de crédito sigue siendo una fila negativa de facturas_proveedor (resta en la cuenta
-- corriente). Esta tabla guarda cuánto de esa nota se aplicó a cada factura o remito.
-- No mueve stock.

create table if not exists nc_aplicaciones (
  id bigint generated always as identity primary key,
  nc_id bigint not null,
  factura_id bigint not null,
  monto numeric not null check (monto > 0),
  creado_en timestamptz not null default now(),
  creado_por text default coalesce(auth.jwt() ->> 'email', '')
);
create index if not exists nca_nc_idx on nc_aplicaciones (nc_id);
create index if not exists nca_factura_idx on nc_aplicaciones (factura_id);
alter table nc_aplicaciones enable row level security;
drop policy if exists "NCA ver" on nc_aplicaciones;
create policy "NCA ver" on nc_aplicaciones for select to authenticated using (true);
-- Sin políticas de insert/update/delete: solo se escribe con las funciones de abajo.

-- Una factura queda pagada si lo pagado + lo cubierto por notas de crédito (asociadas o aplicadas) alcanza.
create or replace function recalcular_factura_proveedor(p_id bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
declare f record; v_nc numeric;
begin
  select * into f from facturas_proveedor where id = p_id for update;
  if not found then return; end if;
  if f.importe <= 0 then return; end if;
  select coalesce(-sum(importe), 0) into v_nc from facturas_proveedor where factura_asociada_id = p_id;
  v_nc := v_nc + coalesce((select sum(monto) from nc_aplicaciones where factura_id = p_id), 0);
  update facturas_proveedor
     set pagada = (coalesce(pagado_monto, 0) + v_nc >= importe - 0.005),
         fecha_pago = case
           when coalesce(pagado_monto, 0) + v_nc >= importe - 0.005 then coalesce(fecha_pago, current_date)
           else null end
   where id = p_id;
end;
$$;

-- Orden de pago: ahora también descuenta lo aplicado por notas de crédito repartidas.
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
      select coalesce(-sum(importe), 0) + coalesce((select sum(monto) from nc_aplicaciones where factura_id = f.id), 0) into v_nc from facturas_proveedor where factura_asociada_id = f.id;
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

-- Aplica una nota de crédito a varias facturas/remitos. p_items = [{"factura_id":1,"monto":1000.5}, ...]
create or replace function aplicar_nota_credito(p_nc bigint, p_items jsonb) returns void
language plpgsql
security definer
set search_path = public
as $$
declare n record; f record; it jsonb; v_monto numeric; v_total numeric := 0; v_disp numeric; v_nc numeric;
begin
  select * into n from facturas_proveedor where id = p_nc for update;
  if not found or n.importe >= 0 then raise exception 'El comprobante % no es una nota de crédito', p_nc; end if;
  if n.factura_asociada_id is not null then
    raise exception 'Esta nota ya está asociada a una sola factura. Quitá la asociación para repartirla.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Elegí al menos una factura'; end if;
  v_disp := -n.importe - coalesce((select sum(monto) from nc_aplicaciones where nc_id = p_nc), 0);

  for it in select * from jsonb_array_elements(p_items) loop
    select * into f from facturas_proveedor where id = (it->>'factura_id')::bigint for update;
    if not found or f.importe <= 0 then raise exception 'La factura % no existe', it->>'factura_id'; end if;
    if lower(trim(f.proveedor)) is distinct from lower(trim(n.proveedor)) then
      raise exception 'La factura % es de otro proveedor', f.id;
    end if;
    v_monto := (it->>'monto')::numeric;
    if v_monto is null or v_monto <= 0 then raise exception 'Monto inválido en la factura %', f.id; end if;
    select coalesce(-sum(importe), 0) + coalesce((select sum(monto) from nc_aplicaciones where factura_id = f.id), 0)
      into v_nc from facturas_proveedor where factura_asociada_id = f.id;
    if v_monto > (f.importe - coalesce(f.pagado_monto, 0) - v_nc) + 0.005 then
      raise exception 'El monto supera el saldo de la factura %', f.id;
    end if;
    v_total := v_total + v_monto;
  end loop;
  if v_total > v_disp + 0.005 then raise exception 'Repartiste más de lo que tiene la nota de crédito'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    insert into nc_aplicaciones (nc_id, factura_id, monto) values (p_nc, (it->>'factura_id')::bigint, (it->>'monto')::numeric);
    perform recalcular_factura_proveedor((it->>'factura_id')::bigint);
  end loop;
end;
$$;

-- Quita aplicaciones: de una nota (p_nc), de una factura (p_factura) o una sola (p_id). Devuelve el saldo a las facturas.
create or replace function quitar_aplicaciones_nc(p_nc bigint default null, p_factura bigint default null, p_id bigint default null) returns void
language plpgsql
security definer
set search_path = public
as $$
declare a record;
begin
  for a in select * from nc_aplicaciones
           where (p_id is not null and id = p_id)
              or (p_id is null and p_nc is not null and nc_id = p_nc)
              or (p_id is null and p_nc is null and p_factura is not null and factura_id = p_factura) loop
    delete from nc_aplicaciones where id = a.id;
    perform recalcular_factura_proveedor(a.factura_id);
  end loop;
end;
$$;

revoke all on function recalcular_factura_proveedor(bigint) from public, anon;
grant execute on function recalcular_factura_proveedor(bigint) to authenticated;
revoke all on function generar_orden_pago(text, date, text, text, text, jsonb, numeric) from public, anon;
grant execute on function generar_orden_pago(text, date, text, text, text, jsonb, numeric) to authenticated;
revoke all on function aplicar_nota_credito(bigint, jsonb) from public, anon;
grant execute on function aplicar_nota_credito(bigint, jsonb) to authenticated;
revoke all on function quitar_aplicaciones_nc(bigint, bigint, bigint) from public, anon;
grant execute on function quitar_aplicaciones_nc(bigint, bigint, bigint) to authenticated;
