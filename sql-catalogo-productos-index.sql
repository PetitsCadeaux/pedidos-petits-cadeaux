-- Extiende la tabla productos_catalogo (creada en sql-catalogo-productos.sql)
-- para que también maneje las dos listas de precios de index.html:
--   negocio = 'comercio'  → Lista 1 (minorista/comercio, precio por unidad)
--   negocio = 'mayorista' → Lista 2 (mayorista Interior, precio por caja)
--
-- Correr este script UNA VEZ en Supabase → SQL Editor → Run, DESPUÉS de
-- haber corrido sql-catalogo-productos.sql. Es seguro de volver a correr.

-- Permite los dos negocios nuevos en la tabla.
alter table productos_catalogo drop constraint if exists productos_catalogo_negocio_check;
alter table productos_catalogo add constraint productos_catalogo_negocio_check
  check (negocio in ('tienda','regaleria','comercio','mayorista'));

-- Carga inicial con el catálogo que ya tenías escrito en index.html, para
-- no perder nada en la migración. Si ya corriste este script antes, no
-- duplica (solo inserta si no hay productos todavía para ese negocio).
insert into productos_catalogo (negocio,nombre,categoria,foto,precio)
select * from (values
  ('comercio','Hamburguesa Clásica x4','Hamburguesa','clasica-x4.jpg',2840::numeric),
  ('comercio','Hamburguesa Mix x4','Hamburguesa','semillas-x4.jpg',2950),
  ('comercio','Hamburguesa Queso x4','Hamburguesa','queso-x4.jpg',3500),
  ('comercio','Hamburguesa Picante x2','Hamburguesa','picante-x2.jpg',1940),
  ('comercio','Hamburguesa Vegano x4','Hamburguesa','vegano-x4.jpg',3290),
  ('comercio','Hamburguesa Smash x4','Hamburguesa','smash-x4.jpg',2300),
  ('comercio','Hamburguesa Smash x8','Hamburguesa','smash-x8.jpg',4180),
  ('comercio','Hamburguesa Queso x2','Hamburguesa',null,1940),
  ('comercio','Pancho Corto Clásico x6','Panchos','corto-clasico-x6.jpg',2380),
  ('comercio','Pancho Corto Mix x6','Panchos','corto-semillas-x6.jpg',2380),
  ('comercio','Pancho Corto Queso x6','Panchos','corto-queso-x6.jpg',3130),
  ('comercio','Pancho XL Clásico x6','Panchos','xl-clasico-x6.jpg',4040),
  ('comercio','Pancho XL Mix x6','Panchos','xl-mix-x6.jpg',4040),
  ('comercio','Pancho XL Queso x6','Panchos','xl-queso-x6.jpg',5410),
  ('comercio','Chips Comunes x6','Variedades','chips-comunes-x6.jpg',1630),
  ('comercio','Chips con Queso x6','Variedades','chips-con-queso-x6.jpg',2190),
  ('comercio','Pebete x2','Variedades','pebete-x2.jpg',1300),
  ('comercio','Molde x1','Variedades','molde-x1.jpg',2550),
  ('comercio','Árabe x4','Variedades','arabe-x4.jpg',1790),
  ('comercio','Lomitero x2','Variedades','lomitero-x2.jpg',1840),
  ('comercio','Pan Dulce','Variedades','pan-dulce.jpg',null),
  ('comercio','Hamburguesa Clásica x42','Gastronómicos','clasica-x42.jpg',30350),
  ('comercio','Hamburguesa Mix x42','Gastronómicos','semillas-x42.jpg',30900),
  ('comercio','Hamburguesa Queso x42','Gastronómicos','queso-x42.jpg',35200),
  ('comercio','Gastro BOOM x1 (Smash Especial)','Gastronómicos',null,620),
  ('comercio','Gastro BOOM XL x1','Gastronómicos',null,660)
) as v(negocio,nombre,categoria,foto,precio)
where not exists (select 1 from productos_catalogo where negocio='comercio');

insert into productos_catalogo (negocio,nombre,categoria,foto,precio)
select * from (values
  ('mayorista','Caja Hamburguesa Clásica x4 (12 packs)','Hamburguesa','caja-clasica-x4.jpg',27275.54::numeric),
  ('mayorista','Caja Hamburguesa Semillas x4 (12 packs)','Hamburguesa','caja-semillas-x4.jpg',28065.52),
  ('mayorista','Caja Hamburguesa Queso x4 (12 packs)','Hamburguesa','caja-queso-x4.jpg',34157.71),
  ('mayorista','Caja Hamburguesa Picante x2 (12 packs)','Hamburguesa',null,19646.89),
  ('mayorista','Caja Hamburguesa Queso x2 (12 packs)','Hamburguesa',null,19646.89),
  ('mayorista','Caja Hamburguesa Vegana x4 (12 packs)','Hamburguesa','caja-vegano-x4.jpg',31748.37),
  ('mayorista','Caja Smash x4 (12 packs)','Hamburguesa','caja-smash-x4.jpg',20685.33),
  ('mayorista','Caja Smash x8 (6 packs)','Hamburguesa','caja-smash-x8.jpg',19254.77),
  ('mayorista','Caja Hamburguesa XL Clásico x 24 u.','Hamburguesa',null,15733.09),
  ('mayorista','Caja Hamburguesa XL Mix Semillas x 24 u.','Hamburguesa',null,16088.56),
  ('mayorista','Caja Hamburguesa XL Queso x 24 u.','Hamburguesa',null,19113.81),
  ('mayorista','Caja Pancho Clásico x6 (12 packs)','Panchos',null,22839.60),
  ('mayorista','Caja Pancho Semillas x6 (12 packs)','Panchos','caja-pancho-semillas-x6.jpg',22839.60),
  ('mayorista','Caja Pancho Queso x6 (12 packs)','Panchos','caja-pancho-queso-x6.jpg',30849.46),
  ('mayorista','Caja Pancho XL Clásico x6 (8 packs)','Panchos','caja-pancho-xl-clasico-x6.jpg',25565.88),
  ('mayorista','Caja Pancho XL Semillas x6 (8 packs)','Panchos','caja-pancho-xl-semillas-x6.jpg',25565.88),
  ('mayorista','Caja Pancho XL Queso x6 (8 packs)','Panchos',null,34684.83),
  ('mayorista','Caja Chips Clásicos x6 (12 packs)','Variedades','caja-chips-clasicos-x6.jpg',15864.02),
  ('mayorista','Caja Chips Queso x6 (12 packs)','Variedades','caja-chips-queso-x6.jpg',21221.12),
  ('mayorista','Caja PBT x2 (12 packs)','Variedades','caja-pbt-x2.jpg',12603.10),
  ('mayorista','Caja Pan de Molde Semillas x10 u.','Variedades','caja-molde-x10.jpg',20991.89),
  ('mayorista','Caja Árabe x4 (18 packs)','Variedades','caja-arabe-x4.jpg',25369.80),
  ('mayorista','Caja Lomitero x2 (12 packs)','Variedades',null,17592.60),
  ('mayorista','Caja Pan Dulce x6 u.','Variedades','pan-dulce.jpg',72524.12),
  ('mayorista','Caja Budín Clásico (Limón y Vainilla) x12 u.','Variedades',null,28982.65),
  ('mayorista','Caja Budín Premium (Chocolate y Banana) x12 u.','Variedades',null,32130.95),
  ('mayorista','Caja Gastro BOOM x48 u.','Gastronómicos',null,21762.15),
  ('mayorista','Caja Gastro BOOM XL x48 u.','Gastronómicos',null,24180.23)
) as v(negocio,nombre,categoria,foto,precio)
where not exists (select 1 from productos_catalogo where negocio='mayorista');
