-- Agrega al catálogo los budines, el Panettone Pazzi y el Pan Dulce con chips (Tienda, Comercio y Mayorista).
-- Correr UNA VEZ en Supabase -> SQL Editor -> Run. Es seguro de volver a correr:
-- si el producto ya existe (mismo catálogo y mismo nombre) actualiza el precio; si no, lo agrega.
--
-- Antes: subir las 4 fotos al bucket "productos-distribuidora" (Storage -> productos-distribuidora -> Upload),
-- con estos nombres exactos: budin-banana-dulce-de-leche.jpg, budin-vainilla.jpg, budin-chocolate.jpg, panettone-pazzi.jpg
-- (el Pan Dulce con chips queda sin foto por ahora).
--
-- También saca del catálogo Mayorista las cajas de budín Clásico y Premium (quedan ocultas, no borradas:
-- si querés eliminarlas del todo, hacelo desde Productos con 🗑️ Borrar).
--
-- Tienda: el precio es por unidad; los packs de 3 y 5 llevan -5% y -12% (igual que el resto del catálogo).
-- Comercio: precio por unidad (el nombre no lleva "Caja").
-- Mayorista: precio por caja (el nombre empieza con "Caja", como el resto de la Lista 2).

with nuevos(negocio,nombre,categoria,foto,tiers,precio) as (values
  ('tienda','Budín de Limón','Dulces','budin-vainilla.jpg','[{"qty":1,"precio":4100},{"qty":3,"precio":11685.0},{"qty":5,"precio":18040.0}]'::jsonb,null::numeric),
  ('tienda','Budín de Vainilla','Dulces','budin-vainilla.jpg','[{"qty":1,"precio":4100},{"qty":3,"precio":11685.0},{"qty":5,"precio":18040.0}]'::jsonb,null::numeric),
  ('tienda','Budín de Banana con Dulce de Leche','Dulces','budin-banana-dulce-de-leche.jpg','[{"qty":1,"precio":4500},{"qty":3,"precio":12825.0},{"qty":5,"precio":19800.0}]'::jsonb,null::numeric),
  ('tienda','Budín de Chocolate con Chips de Chocolate','Dulces','budin-chocolate.jpg','[{"qty":1,"precio":4500},{"qty":3,"precio":12825.0},{"qty":5,"precio":19800.0}]'::jsonb,null::numeric),
  ('tienda','Panettone Pazzi','Dulces','panettone-pazzi.jpg','[{"qty":1,"precio":17000},{"qty":3,"precio":48450.0},{"qty":5,"precio":74800.0}]'::jsonb,null::numeric),
  ('tienda','Pan Dulce con Chips de Chocolate','Dulces',null,'[{"qty":1,"precio":6300},{"qty":3,"precio":17955.0},{"qty":5,"precio":27720.0}]'::jsonb,null::numeric),
  ('comercio','Budín de Limón','Dulces','budin-vainilla.jpg',null::jsonb,3150::numeric),
  ('comercio','Budín de Vainilla','Dulces','budin-vainilla.jpg',null::jsonb,3150::numeric),
  ('comercio','Budín de Banana con Dulce de Leche','Dulces','budin-banana-dulce-de-leche.jpg',null::jsonb,3500::numeric),
  ('comercio','Budín de Chocolate con Chips de Chocolate','Dulces','budin-chocolate.jpg',null::jsonb,3500::numeric),
  ('comercio','Panettone Pazzi','Dulces','panettone-pazzi.jpg',null::jsonb,13100::numeric),
  ('comercio','Pan Dulce con Chips de Chocolate','Dulces',null,null::jsonb,4900::numeric),
  ('mayorista','Caja Budín de Limón x12 u.','Dulces','budin-vainilla.jpg',null::jsonb,35000::numeric),
  ('mayorista','Caja Budín de Vainilla x12 u.','Dulces','budin-vainilla.jpg',null::jsonb,35000::numeric),
  ('mayorista','Caja Budín de Banana con Dulce de Leche x12 u.','Dulces','budin-banana-dulce-de-leche.jpg',null::jsonb,40000::numeric),
  ('mayorista','Caja Budín de Chocolate con Chips de Chocolate x12 u.','Dulces','budin-chocolate.jpg',null::jsonb,40000::numeric),
  ('mayorista','Caja Panettone Pazzi x6 u.','Dulces','panettone-pazzi.jpg',null::jsonb,72000::numeric),
  ('mayorista','Caja Pan Dulce con Chips de Chocolate x8 u.','Dulces',null,null::jsonb,32000::numeric)
),
actualizados as (
  update productos_catalogo p
     set precio = n.precio, tiers = n.tiers, activo = true
    from nuevos n
   where p.negocio = n.negocio and p.nombre = n.nombre
  returning p.negocio, p.nombre
)
insert into productos_catalogo (negocio,nombre,categoria,foto,tiers,precio)
select n.negocio,n.nombre,n.categoria,n.foto,n.tiers,n.precio
  from nuevos n
 where not exists (select 1 from productos_catalogo p where p.negocio=n.negocio and p.nombre=n.nombre);

-- Saca (oculta) las cajas de budín Clásico y Premium del catálogo Mayorista.
update productos_catalogo
   set activo = false
 where negocio = 'mayorista'
   and nombre in ('Caja Budín Clásico (Limón y Vainilla) x12 u.','Caja Budín Premium (Chocolate y Banana) x12 u.');
