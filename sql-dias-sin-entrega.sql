-- Días en que NO se entrega (feriados, panificadora cerrada, etc.).
-- Correr UNA VEZ en Supabase → SQL Editor → Run. Es seguro de volver a correr.
-- Los clientes (página de pedidos) los leen para no ofrecer esas fechas;
-- los carga el admin desde Configuración → Días sin entrega.

create table if not exists dias_sin_entrega (
  fecha date primary key,
  motivo text
);

alter table dias_sin_entrega enable row level security;

drop policy if exists "Ver dias sin entrega publico" on dias_sin_entrega;
create policy "Ver dias sin entrega publico" on dias_sin_entrega
  for select to anon, authenticated using (true);

drop policy if exists "Admin gestiona dias sin entrega" on dias_sin_entrega;
create policy "Admin gestiona dias sin entrega" on dias_sin_entrega
  for all to authenticated using (true) with check (true);
