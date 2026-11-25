# genshin-api

API REST con datos del juego **Genshin Impact**: personajes, armas, artefactos, enemigos, elementos, naciones y más, con imágenes. Es el backend del proyecto del Taller DevOps (el frontend está en [genshin-web](https://github.com/Br1-Filippi/genshin-web)).

## Origen y licencia

Este proyecto es un trabajo derivado de **[genshindev/api](https://github.com/genshindev/api)** (© 2020 genshin.dev), distribuido bajo la **Open Software License v3.0** (ver `LICENSE`). Se mantiene la misma licencia.

Cambios respecto del original:

- Código reescrito para Koa 3 / TypeScript 5, separando `app.ts` (aplicación) de `index.ts` (servidor) para poder testearla.
- Si una traducción no existe, se devuelve la versión en inglés; si existe, los campos que le falten se completan con el inglés.
- Validación de los segmentos de ruta (solo letras, números y guiones).
- Caché en memoria simple (`Map`) en lugar de `keyv`; se quitaron Sentry, forever, gulp y otras dependencias sin uso.
- Tests con Jest + Supertest (coverage > 95 %).
- Solo se incluyen las imágenes que usa el frontend: `icon-big` y `card` (reducida a WebP 540×960) de cada personaje, e íconos de elementos y naciones.
- Dockerfile y configuración de SonarQube para el pipeline de CI/CD.

## Endpoints

| Método y ruta | Descripción |
|---|---|
| `GET /` | Tipos de datos disponibles |
| `GET /health` | Estado de la API |
| `GET /:type` | Ids de las entidades de un tipo (`/characters`) |
| `GET /:type/all?lang=es&campo=valor` | Todas las entidades, con filtros por campo (`/characters/all?vision=pyro&rarity=5`) |
| `GET /:type/:id?lang=es` | Una entidad (`/characters/hu-tao?lang=es`) |
| `GET /:type/:id/list` | Imágenes disponibles de una entidad |
| `GET /:type/:id/:imagen[.png\|.jpg\|.webp]` | Imagen (`/characters/hu-tao/card`) |

## Ejecutar

```bash
npm ci
npm test          # tests + coverage (coverage/lcov.info)
npm run build     # compila a dist/
npm start         # http://localhost:5000
```

Con Docker (después de `npm run build`):

```bash
docker build -t genshin-api .
docker run -d -p 4000:5000 --name genshin-api genshin-api
```

## Ramas

- `main`: rama base.
- `dev`: integración.
- `feature/**`: desarrollo; las construye el job de Jenkins `genshin_api_dev` (puerto 4001).
- `release/**`: versiones a producción; las construye el job `genshin_api_prod` (puerto 4000).
