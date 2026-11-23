-- Agrega a "visitas" el paso del embudo de compra (ver producto, agregar al carrito, etc.)
-- Correr UNA VEZ en Supabase -> SQL Editor -> Run. Es seguro de volver a correr.
alter table visitas add column if not exists evento text;
create index if not exists visitas_evento_idx on visitas (evento);
