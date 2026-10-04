-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar > RUN
-- Agrega campos a facturas_proveedor para poder armar el Libro IVA Compras:
-- CUIT del proveedor, percepción de IVA, percepción de IIBB y otros impuestos.

alter table facturas_proveedor
  add column if not exists cuit_proveedor text,
  add column if not exists percepcion_iva numeric,
  add column if not exists percepcion_iibb numeric,
  add column if not exists otros_impuestos numeric,
  add column if not exists otros_impuestos_concepto text;
