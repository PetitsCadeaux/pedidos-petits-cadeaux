-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar > RUN
-- La tabla arca_wsaa_token guardaba un solo token (para WSFE). Ahora que
-- también vamos a consultar el Padrón de ARCA (otro servicio, con su propio
-- token de acceso), le agregamos una columna "service" para poder guardar
-- un token por cada servicio en vez de uno solo.

alter table arca_wsaa_token
  add column if not exists service text;

update arca_wsaa_token set service = 'wsfe' where id = 1 and service is null;

insert into arca_wsaa_token (id, service)
  values (2, 'ws_sr_padron_a13')
  on conflict (id) do nothing;

alter table arca_wsaa_token
  alter column service set not null,
  alter column service set default 'wsfe';
