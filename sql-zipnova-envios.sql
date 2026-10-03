-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar > RUN
-- Agrega a la tabla de pedidos los campos de dirección estructurada
-- (necesarios para cotizar/crear envíos con Zipnova) y los datos del
-- envío creado (para poder consultarlo o re-usarlo después).

alter table pedidos_distribuidora
  add column if not exists direccion_calle text,
  add column if not exists direccion_altura text,
  add column if not exists direccion_piso_depto text,
  add column if not exists localidad text,
  add column if not exists provincia text,
  add column if not exists codigo_postal text,
  add column if not exists dni text,
  add column if not exists zipnova_shipment_id text,
  add column if not exists zipnova_carrier_id text,
  add column if not exists zipnova_tracking_url text;
