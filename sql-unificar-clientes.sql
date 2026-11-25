-- Unificar clientes duplicados (mismo comercio escrito distinto, dirección mal tipeada, etc.).
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
-- Requiere haber corrido antes sql-cobranzas-clientes.sql.
--
-- No toca ni borra pedidos, cobranzas ni saldos: solo guarda "este domicilio es el mismo cliente que aquel".
-- Se puede deshacer en cualquier momento desde Cuenta corriente → Unificar clientes → Separar.

create table if not exists clientes_unificados (
  origen text primary key,                       -- domicilio normalizado que se absorbe
  destino text not null,                         -- domicilio normalizado del cliente que queda
  creado_en timestamptz not null default now(),
  creado_por text default coalesce(auth.jwt() ->> 'email', '')
);
alter table clientes_unificados enable row level security;
drop policy if exists "CU ver" on clientes_unificados;
create policy "CU ver" on clientes_unificados for select to authenticated using (true);
-- Sin políticas de escritura: se modifica solo con las funciones de abajo.

-- Domicilio "canónico": si fue unificado con otro, devuelve el del cliente que quedó.
create or replace function canon_domicilio(t text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select destino from clientes_unificados where origen = norm_domicilio(t)), norm_domicilio(t))
$$;

create or replace function unificar_clientes(p_origen text, p_destino text) returns void
language plpgsql security definer set search_path = public as $$
declare o text := norm_domicilio(p_origen); d text := canon_domicilio(p_destino);
begin
  if o = '' or d = '' then raise exception 'Faltan los clientes a unir'; end if;
  if o = d then raise exception 'Son el mismo cliente'; end if;
  -- lo que ya apuntaba al origen pasa a apuntar al destino
  update clientes_unificados set destino = d where destino = o;
  insert into clientes_unificados (origen, destino) values (o, d)
  on conflict (origen) do update set destino = excluded.destino;
end;
$$;

create or replace function separar_cliente(p_origen text) returns void
language sql security definer set search_path = public as $$
  delete from clientes_unificados where origen = norm_domicilio(p_origen);
$$;

-- Cobranzas: ahora reconoce los domicilios unificados como un solo cliente.
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
   where canon_domicilio(p.domicilio) = canon_domicilio(p_domicilio) and p.medio is not null;
  v_credito := greatest(0, coalesce(v_credito, 0));

  if p_items is not null then
    for it in select * from jsonb_array_elements(p_items) loop
      select * into o from pedidos_distribuidora where id = (it->>'pedido_id')::bigint for update;
      if not found then raise exception 'El pedido % no existe', it->>'pedido_id'; end if;
      if canon_domicilio(o.domicilio) is distinct from canon_domicilio(p_domicilio) then
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

revoke all on function canon_domicilio(text) from public, anon;
grant execute on function canon_domicilio(text) to authenticated;
revoke all on function unificar_clientes(text, text) from public, anon;
grant execute on function unificar_clientes(text, text) to authenticated;
revoke all on function separar_cliente(text) from public, anon;
grant execute on function separar_cliente(text) to authenticated;
revoke all on function registrar_cobranza(text, date, text, text, text, numeric, jsonb) from public, anon;
grant execute on function registrar_cobranza(text, date, text, text, text, numeric, jsonb) to authenticated;
