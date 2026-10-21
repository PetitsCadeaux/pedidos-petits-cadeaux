-- Cobranzas de clientes con imputación automática a los pedidos más antiguos.
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
--
-- Una cobranza ("me pagó $X") se reparte entre los pedidos sin cobrar del cliente, empezando por
-- el más antiguo. Los pedidos cubiertos quedan "Cobrado · medio" (el mismo estado de Facturación),
-- y los cubiertos a medias guardan cuánto se cobró (cobrado_monto).
-- Lo que sobra queda como saldo a favor del cliente y se puede usar en la próxima cobranza.
-- Las cobranzas viejas (sin medio) no se tocan ni cuentan como saldo a favor.

alter table pedidos_distribuidora add column if not exists cobrado_monto numeric not null default 0;

alter table pagos_clientes add column if not exists medio text;
alter table pagos_clientes add column if not exists referencia text;
alter table pagos_clientes add column if not exists creado_por text default coalesce(auth.jwt() ->> 'email', '');

create table if not exists pagos_clientes_pedidos (
  id bigint generated always as identity primary key,
  pago_id bigint not null,
  pedido_id bigint not null,
  monto numeric not null
);
create index if not exists pcp_pago_idx on pagos_clientes_pedidos (pago_id);
create index if not exists pcp_pedido_idx on pagos_clientes_pedidos (pedido_id);
alter table pagos_clientes_pedidos enable row level security;
drop policy if exists "PCP ver" on pagos_clientes_pedidos;
create policy "PCP ver" on pagos_clientes_pedidos for select to authenticated using (true);
-- Sin políticas de escritura: solo se modifica con las funciones de abajo.

create or replace function norm_domicilio(t text) returns text
language sql immutable as $$
  select lower(trim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g')))
$$;

-- Registra la cobranza y la reparte entre los pedidos elegidos (p_items = [{pedido_id, monto}]).
-- p_monto es la plata recibida ahora. Se puede repartir hasta p_monto + el saldo a favor que el
-- cliente ya tenga de cobranzas anteriores hechas con esta función. Devuelve el id de la cobranza.
create or replace function registrar_cobranza(
  p_domicilio text, p_fecha date, p_medio text, p_referencia text, p_nota text,
  p_monto numeric, p_items jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb; o record; v_monto numeric; v_total numeric := 0; v_pago bigint; v_credito numeric; v_cobrado boolean;
begin
  if p_medio not in ('Efectivo', 'Transferencia', 'Mercado Pago') then
    raise exception 'Elegí el medio de cobro';
  end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Ingresá el monto cobrado'; end if;

  select coalesce(sum(p.monto), 0) - coalesce(sum((select coalesce(sum(l.monto), 0) from pagos_clientes_pedidos l where l.pago_id = p.id)), 0)
    into v_credito
    from pagos_clientes p
   where norm_domicilio(p.domicilio) = norm_domicilio(p_domicilio) and p.medio is not null;
  v_credito := greatest(0, coalesce(v_credito, 0));

  if p_items is not null then
    for it in select * from jsonb_array_elements(p_items) loop
      select * into o from pedidos_distribuidora where id = (it->>'pedido_id')::bigint for update;
      if not found then raise exception 'El pedido % no existe', it->>'pedido_id'; end if;
      if norm_domicilio(o.domicilio) is distinct from norm_domicilio(p_domicilio) then
        raise exception 'El pedido % es de otro cliente', o.id;
      end if;
      if coalesce(o.anulado, false) then raise exception 'El pedido % está anulado', o.id; end if;
      if o.total is null then raise exception 'El pedido % tiene el total a confirmar', o.id; end if;
      v_cobrado := o.cobro in ('Efectivo', 'Transferencia', 'Mercado Pago')
                   or (o.estado_pago = 'Mercado Pago' and coalesce(o.pagado, false));
      if v_cobrado then raise exception 'El pedido % ya figura cobrado', o.id; end if;
      v_monto := (it->>'monto')::numeric;
      if v_monto is null or v_monto <= 0 then raise exception 'Monto inválido en el pedido %', o.id; end if;
      if v_monto > (o.total - coalesce(o.cobrado_monto, 0)) + 0.005 then
        raise exception 'El monto supera lo que falta cobrar del pedido %', o.id;
      end if;
      v_total := v_total + v_monto;
    end loop;
  end if;

  if v_total > p_monto + v_credito + 0.005 then
    raise exception 'Repartiste más que lo cobrado más el saldo a favor del cliente';
  end if;

  insert into pagos_clientes (domicilio, monto, fecha, nota, medio, referencia)
  values (p_domicilio, p_monto, p_fecha, nullif(p_nota, ''), p_medio, nullif(p_referencia, ''))
  returning id into v_pago;

  if p_items is not null then
    for it in select * from jsonb_array_elements(p_items) loop
      v_monto := (it->>'monto')::numeric;
      insert into pagos_clientes_pedidos (pago_id, pedido_id, monto)
      values (v_pago, (it->>'pedido_id')::bigint, v_monto);
      update pedidos_distribuidora
         set cobrado_monto = coalesce(cobrado_monto, 0) + v_monto
       where id = (it->>'pedido_id')::bigint;
      update pedidos_distribuidora
         set cobro = p_medio, cobro_fecha = p_fecha::timestamptz
       where id = (it->>'pedido_id')::bigint and cobrado_monto >= total - 0.005;
    end loop;
  end if;

  return v_pago;
end;
$$;

-- Anula una cobranza hecha con la función de arriba: devuelve lo imputado a cada pedido
-- (los que estaban cobrados por esta cobranza vuelven a "por cobrar") y borra la cobranza.
create or replace function anular_cobranza(p_pago bigint) returns void
language plpgsql
security definer
set search_path = public
as $$
declare l record; pg record;
begin
  select * into pg from pagos_clientes where id = p_pago;
  if not found then raise exception 'La cobranza no existe'; end if;
  for l in select * from pagos_clientes_pedidos where pago_id = p_pago loop
    update pedidos_distribuidora
       set cobrado_monto = greatest(0, coalesce(cobrado_monto, 0) - l.monto)
     where id = l.pedido_id;
    update pedidos_distribuidora
       set cobro = null, cobro_fecha = null
     where id = l.pedido_id and cobro = pg.medio and cobrado_monto < total - 0.005;
  end loop;
  delete from pagos_clientes_pedidos where pago_id = p_pago;
  delete from pagos_clientes where id = p_pago;
end;
$$;

revoke all on function registrar_cobranza(text, date, text, text, text, numeric, jsonb) from public, anon;
grant execute on function registrar_cobranza(text, date, text, text, text, numeric, jsonb) to authenticated;
revoke all on function anular_cobranza(bigint) from public, anon;
grant execute on function anular_cobranza(bigint) to authenticated;
