# sensor-web (v2)

Panel web de PROYECTO SENSOR, hecho de cero para SensorDB (D-83). Laboratorio AGTECH, INTA EEA Catamarca.
Plan y alcance: `sensor-central/docs/propuestas/web-v2.md`. Estilo: `sensor-central/docs/estilo.md` (línea noche, D-82).

Etapa W1 (esta rama): ingresar, crear cuenta y recuperar contraseña; **Red** (mapa, equipos que
requieren atención, tabla de sitios) y **Sitio** (último dato, gráficos del período, lectura agronómica,
descarga CSV). Campos, lotes, equipos y administración vienen en W2 y W3.

## Herramientas

Vite 8, React 19, react-router 7, Tailwind 4, TypeScript 6, vitest, oxlint. Mapa con Leaflet e imagen
satelital de Esri (sin clave). Letra IBM Plex Sans y Plex Mono guardada en el paquete (`@fontsource`,
licencia OFL). Gráficos en SVG propio, con la misma lógica que la app.

`src/datos/` copia la lógica de `sensor-app/src/datos/` (cada archivo lo dice en la primera línea):
un cambio en la cuenta de agua útil, las escalas o las frases se hace en los dos repos.

## Correr en la compu

```bash
npm install
cp .env.example .env     # completar VITE_SUPABASE_PUBLISHABLE_KEY con la clave publicable de SensorDB
npm run dev
```

La clave publicable es la pública del proyecto (Supabase → Settings → API keys). **Nunca** la
`service_role` ni la clave secreta. `.env` no se sube al repo.

Antes de subir un cambio:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Publicar en Cloudflare Pages (hasta pasarla a INTA)

1. Cloudflare → Workers & Pages → Create → Pages → conectar el repo `sensor-web`.
2. Rama de producción: la que se decida al aprobar (hoy el trabajo está en `v2`; `main` sigue siendo la web vieja).
3. Build command `npm run build`, output `dist`, variable `NODE_VERSION` = `22`.
4. Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (las mismas del `.env`).
5. `public/_redirects` ya manda todas las rutas a `index.html` (rutas de la web).
6. En Supabase (SensorDB) → Authentication → URL configuration: agregar la dirección de Pages
   (`https://<proyecto>.pages.dev`) en Site URL o Redirect URLs, para que funcionen la confirmación
   de correo y el cambio de contraseña.
