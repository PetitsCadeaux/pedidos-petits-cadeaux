-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar > RUN
-- 1) Condición frente al IVA del cliente, para mostrar en la factura impresa.
-- 2) Campos para la Nota de Crédito C asociada a una factura ya emitida.

alter table pedidos_distribuidora
  add column if not exists factura_cliente_condicion_iva text,
  add column if not exists nc_cae text,
  add column if not exists nc_cae_vencimiento date,
  add column if not exists nc_tipo int,
  add column if not exists nc_pto_vta int,
  add column if not exists nc_nro int,
  add column if not exists nc_motivo text,
  add column if not exists nc_facturada_en timestamptz;
