-- 1) Budines y Pan dulce pasan a la categoría "Dulces" en todas las listas
update productos_catalogo
   set categoria = 'Dulces'
 where nombre ilike '%budín%' or nombre ilike '%budin%' or nombre ilike '%pan dulce%';

-- 2) Dar de baja el picante (ya no se fabrica) en todas las listas
update productos_catalogo
   set activo = false
 where nombre ilike '%picante%';

-- Control: debería mostrar los Dulces y el picante inactivo
select negocio, nombre, categoria, activo
  from productos_catalogo
 where categoria = 'Dulces' or nombre ilike '%picante%'
 order by negocio, categoria, nombre;
