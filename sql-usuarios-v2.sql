-- Agrega nombre de usuario y email de contacto opcional. Correr UNA VEZ en Supabase → SQL Editor.
alter table usuarios_admin add column if not exists usuario text;
alter table usuarios_admin add column if not exists email_contacto text;
