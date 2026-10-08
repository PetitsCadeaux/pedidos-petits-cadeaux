-- Pedidos v2: anular pedidos (en vez de borrar) y cobranza separada de la forma de pago.
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
--
-- estado_pago sigue siendo la FORMA DE PAGO que elige el cliente (la usa la hoja de ruta).
-- La cobranza real (si ya se cobró y cómo) pasa a cobro / cobro_fecha, y se gestiona en Facturación.

alter table pedidos_distribuidora add column if not exists anulado boolean not null default false;
alter table pedidos_distribuidora add column if not exists anulado_en timestamptz;
alter table pedidos_distribuidora add column if not exists anulado_motivo text;

-- cobro: null = por cobrar | 'Efectivo' | 'Transferencia' | 'Mercado Pago' | 'Demorado'
alter table pedidos_distribuidora add column if not exists cobro text;
alter table pedidos_distribuidora add column if not exists cobro_fecha timestamptz;
