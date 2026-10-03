-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar > RUN
-- Guarda la opción de envío que el cliente eligió y cotizó él mismo en la
-- tienda (antes de confirmar el pedido), para que quede registrada junto
-- al pedido aunque todavía no se haya creado el envío real en Zipnova.

alter table pedidos_distribuidora
  add column if not exists envio_elegido_transportista text,
  add column if not exists envio_elegido_costo numeric,
  add column if not exists zipnova_service_type text,
  add column if not exists zipnova_logistic_type text;
