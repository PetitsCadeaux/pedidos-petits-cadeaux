-- 1) Foto del Lomitero (la tienda no la tenía cargada)
update productos_catalogo
   set foto = 'lomitero-x2.jpg'
 where negocio = 'tienda' and nombre ilike 'lomitero%' and (foto is null or foto = '');

-- 2) Agregar los Panchos XL a la Tienda.
--    PRECIOS PROPUESTOS (mismo margen que los panchos cortos): revisalos y,
--    si alguno no es el correcto, cambialo después desde Productos.
--    Packs: x3 = -5%, x5 = -12%, igual que el resto de la tienda.
insert into productos_catalogo (negocio, nombre, categoria, foto, tiers, precio, activo)
select v.negocio, v.nombre, v.categoria, v.foto, v.tiers, null, true
from (values
  ('tienda','Pancho XL Clásico x6','Panchos','xl-clasico-x6.jpg','[{"qty":1,"precio":5800},{"qty":3,"precio":16530},{"qty":5,"precio":25520}]'::jsonb),
  ('tienda','Pancho XL Semillas x6','Panchos','xl-mix-x6.jpg','[{"qty":1,"precio":5800},{"qty":3,"precio":16530},{"qty":5,"precio":25520}]'::jsonb),
  ('tienda','Pancho XL Queso x6','Panchos','xl-queso-x6.jpg','[{"qty":1,"precio":7600},{"qty":3,"precio":21660},{"qty":5,"precio":33440}]'::jsonb)
) as v(negocio,nombre,categoria,foto,tiers)
where not exists (
  select 1 from productos_catalogo p where p.negocio = v.negocio and p.nombre = v.nombre
);

-- Control
select nombre, categoria, foto, activo, tiers->0->>'precio' as precio_x1
  from productos_catalogo
 where negocio = 'tienda' and (nombre ilike 'pancho%' or nombre ilike 'lomitero%')
 order by nombre;
