# Panel de Producción

Panel de control de producción en tiempo real para Pazzi (plantas Peña y Saraza), pensado para proyectarse en la sala de reuniones. Está armado para poder ofrecerse después a otras empresas (multiempresa).

## Qué muestra

La pantalla de inicio es el **mapa de áreas** con el panel **EN VIVO · Producción** al costado (cuadradito titilando, empaquetado contra la meta, plantas, merma y paradas). Cada área tiene un pin: verde y latiendo si está integrada (se entra con un toque), gris si es "Próximamente". Al abrir, una bienvenida con el "toc toc" y la mascota; después la mascota queda abajo como bot con avisos sacados de los datos reales. No rota solo: se pasa de una pantalla a otra con los pins, el botón "Entrar a…" o las pestañas de abajo. La mascota camina por la línea inferior (tocarla repite la bienvenida). Cinco vistas:

| Vista | Contenido |
|-------|-----------|
| Mapa de áreas (inicio) | Mapa con pins por área, panel EN VIVO de producción y Alerta insumos |
| Producción | Empaquetado vs meta, merma total, órdenes en curso, insumos bajo mínimo, paradas, gráfico por hora, últimos registros |
| Por etapa | Producción, Horno, Desmolde y Empaquetado por planta, con merma y tiempo por lote |
| Stock | Insumos y embalaje contra su mínimo, y producto terminado |
| Órdenes | Avance de cada orden contra su objetivo |

Se puede pasar a pantalla completa y navegar con las pestañas. Cada vista tiene su dirección (`#inicio`, `#produccion`, `#etapas`, `#stock`, `#ordenes`).

## Modo demo y modo real

- **Sin claves de Supabase:** arranca en modo demo con datos de ejemplo en movimiento y un cartel visible.
- **Con claves:** pide login, lee las vistas de Supabase y se actualiza solo (tiempo real más lectura cada 20 segundos).
- `VITE_MODO_DEMO=true` fuerza el modo demo aunque haya claves, útil para una presentación.

## Puesta en marcha

```bash
npm install
cp .env.example .env     # completá las claves si querés modo real
npm run dev
```

### Conectar a Supabase

1. Ejecutá `supabase/schema.sql` en el SQL Editor del proyecto.
2. Cargá la empresa, las plantas, las etapas y un perfil que vincule tu usuario con la empresa (hay un ejemplo al final del SQL).
3. Creá un usuario de solo lectura para la pantalla de la sala (rol `lector` en `perfiles`).
4. Completá `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (solo la clave anon, nunca la `service_role`).

### Publicar en Vercel

1. Importá el repo en Vercel (detecta Vite solo).
2. Cargá las variables `VITE_*` en Settings → Environment Variables.
3. Para vender el sistema a terceros necesitás el plan comercial de Vercel.

El sitio pide login y trae `noindex`, pero igual no compartas el link fuera de la empresa.

## Mascota y bot

La mascota (Bun) está dibujada en vectores y animada pieza por pieza: gorra, cara, ojos, boca, brazos, piernas y zapatillas se mueven por separado, con resortes para que la gorra y la cara se retrasen un instante respecto del cuerpo (`src/lib/bun.js`, usada desde `Mascota.jsx`). Estados: idle, walk, hola, wave, laugh, sleep, angry, wow, party. Camina por la línea de abajo y cada tanto se frena para saludar, reírse o dormirse (`Caminante.jsx`). También reacciona a los datos: se enoja si hay un insumo bajo mínimo (y se lo recuerda cada 4 minutos), se sorprende con una parada nueva y festeja al llegar a la meta de empaquetado. El nombre del bot se cambia con `VITE_BOT_NOMBRE` (por defecto "Bun"). Las frases salen de `src/lib/bot.js`. Tocar la mascota de abajo repite la bienvenida, que por defecto se muestra una vez por sesión del navegador.

## Sonido

Los avisos de la mascota (enojo, sorpresa y festejo) suenan con un "ding" corto generado en el navegador (`src/lib/sonido.js`, sin archivos de audio). Los navegadores no dejan sonar nada hasta que alguien toca la pantalla una vez; en la pantalla de la sala, tocá o apretá una tecla al abrir. El botón "Sonido" del encabezado lo apaga y se acuerda de la elección.

## Integrar un módulo nuevo

En `src/config.js`, pasá el área a `true` dentro de `modulos` y, en `src/views/Inicio.jsx`, sumala a `ENTRA` (a qué pantalla lleva su pin) y, si querés números en el costado, a `liveOf`. Mientras esté en `false`, el mapa la muestra como "Próximamente" y no muestra números.

## Estructura

```
src/config.js          zona horaria, turno, módulos integrados
src/lib/demo.js        simulador del modo demo
src/lib/live.js        lectura de las vistas de Supabase
src/lib/useData.js     elige demo o real y mantiene los datos al día
src/views/             una pantalla por vista (Inicio.jsx = mapa + EN VIVO)
src/components/        gráfico por hora, medidores, bienvenida y bot
src/lib/bun.js         la mascota (vectores + animación)
src/components/        gráfico por hora, medidores, estados
supabase/schema.sql    tablas, trigger receta → stock, vistas y seguridad por empresa
```

## Seguridad

- Repositorio privado.
- Nunca subir `.env` (ya está en `.gitignore`).
- La seguridad real está en la base: cada tabla tiene RLS por empresa. El frontend solo usa la clave anon.

## Mascota: Migui
La mascota por defecto es **Migui** (`src/lib/migui.js`, vectorial animada: hola con corazones, guiño, risa, sueño, enojo, sorpresa, fiesta, y habla).
`<Mascota skin="migui" />` es el valor por defecto; `skin="bun"|"tierno"|"migas"` usa el motor de Bun (`src/lib/bun.js`).
