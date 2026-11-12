-- Dar de baja el "Pan Dulce" viejo (es el mismo producto que el Panettone Pazzi).
-- NO toca "Pan Dulce con Chips de Chocolate" (ese es otro producto y se queda).
update productos_catalogo
   set activo = false
 where nombre ilike '%pan dulce%'
   and nombre not ilike '%chips%';

-- Control: lista todo lo que tenga "pan dulce" o "panettone" y si está activo
select negocio, nombre, categoria, precio, activo
  from productos_catalogo
 where nombre ilike '%pan dulce%' or nombre ilike '%panettone%'
 order by negocio, nombre;
