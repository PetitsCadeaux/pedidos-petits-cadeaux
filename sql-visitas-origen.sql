-- Agrega a "visitas" de dónde viene cada visita (Instagram, anuncio, etc.)
-- Correr UNA VEZ en Supabase -> SQL Editor -> Run. Es seguro de volver a correr.
alter table visitas add column if not exists origen text;
alter table visitas add column if not exists medio text;
alter table visitas add column if not exists campania text;
create index if not exists visitas_origen_idx on visitas (origen);
