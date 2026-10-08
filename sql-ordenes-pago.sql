-- Órdenes de pago a proveedores: pagar una o varias facturas, elegir el medio de pago
-- y generar una orden de pago numerada e imprimible.
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
--
-- La orden de pago es una fila de pagos_proveedor (el número de orden es su id), así que
-- la cuenta corriente del proveedor y el dashboard siguen sumando igual que antes.

alter table pagos_proveedor add column if not exists medio text;
alter table pagos_proveedor add column if not exists referencia text;
alter table pagos_proveedor add column if not exists anulado boolean not null default false;
alter table pagos_proveedor add column if not exists anulado_en timestamptz;
alter table pagos_proveedor add column if not exists creado_por text default coalesce(auth.jwt() ->> 'email', '');

alter table facturas_proveedor add column if not exists pagado_monto numeric not null default 0;

-- Qué facturas cubre cada orden de pago (y por cuánto).
create table if not exists pagos_proveedor_facturas (
  id bigint generated always as identity primary key,
  pago_id bigint not null,
  factura_id bigint not null,
  monto numeric not null
);
create index if not exists ppf_pago_idx on pagos_proveedor_facturas (pago_id);
create index if not exists ppf_factura_idx on pagos_proveedor_facturas (factura_id);
alter table pagos_proveedor_facturas enable row level security;
drop policy if exists "PPF ver" on pagos_proveedor_facturas;
create policy "PPF ver" on pagos_proveedor_facturas for select to authenticated using (true);
-- Sin políticas de insert/update/delete: solo se escribe con las funciones de abajo.

-- Genera la orden de pago de forma atómica: valida, crea el pago, lo reparte entre las
-- facturas y marca como pagadas las que quedan cubiertas. Devuelve el número de orden.
create or replace function generar_orden_pago(
  p_proveedor text, p_fecha date, p_medio text, p_referencia text, p_nota text, p_items jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb; f record; v_monto numeric; v_total numeric := 0; v_pago bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Elegí al menos una factura';
  end if;
  if coalesce(p_medio, '') = '' then
    raise exception 'Elegí el medio de pago';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into f from facturas_proveedor where id = (it->>'factura_id')::bigint for update;
    if not found then raise exception 'La factura % no existe', it->>'factura_id'; end if;
    if lower(trim(f.proveedor)) is distinct from lower(trim(p_proveedor)) then
      raise exception 'La factura % es de otro proveedor', f.id;
    end if;
    v_monto := (it->>'monto')::numeric;
    if v_monto is null or v_monto <= 0 then raise exception 'Monto inválido en la factura %', f.id; end if;
    if v_monto > (f.importe - coalesce(f.pagado_monto, 0)) + 0.005 then
      raise exception 'El monto supera el saldo de la factura %', f.id;
    end if;
    v_total := v_total + v_monto;
  end loop;

  insert into pagos_proveedor (proveedor, monto, fecha, nota, medio, referencia)
  values (p_proveedor, v_total, p_fecha, nullif(p_nota, ''), p_medio, nullif(p_referencia, ''))
  returning id into v_pago;

  for it in select * from jsonb_array_elements(p_items) loop
    v_monto := (it->>'monto')::numeric;
    insert into pagos_proveedor_facturas (pago_id, factura_id, monto)
    values (v_pago, (it->>'factura_id')::bigint, v_monto);
    update facturas_proveedor
       set pagado_monto = coalesce(pagado_monto, 0) + v_monto,
           pagada = (coalesce(pagado_monto, 0) + v_monto >= importe - 0.005),
           fecha_pago = case when coalesce(pagado_monto, 0) + v_monto >= importe - 0.005 then p_fecha else fecha_pago end
     where id = (it->>'factura_id')::bigint;
  end loop;

  return v_pago;
end;
$$;

-- Anula una orden de pago: devuelve las facturas a pendiente y deja la orden marcada como anulada.
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
       set pagado_monto = greatest(0, coalesce(pagado_monto, 0) - l.monto),
           pagada = false,
           fecha_pago = null
     where id = l.factura_id;
  end loop;
  update pagos_proveedor set anulado = true, anulado_en = now() where id = p_pago;
end;
$$;

revoke all on function generar_orden_pago(text, date, text, text, text, jsonb) from public, anon;
grant execute on function generar_orden_pago(text, date, text, text, text, jsonb) to authenticated;
revoke all on function anular_orden_pago(bigint) from public, anon;
grant execute on function anular_orden_pago(bigint) to authenticated;
