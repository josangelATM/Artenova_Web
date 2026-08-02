# Artenova Web

Tienda administrable para Artenova, taller creativo de corte y grabado láser. El flujo v1 permite publicar productos personalizados, mostrar precios desde y escalas por cantidad, recibir pedidos de clientes invitados y gestionar el contacto desde un panel admin.

## Stack

- Monorepo pnpm.
- `apps/web`: Vite + React + TypeScript + Material UI.
- `apps/api`: Express + TypeScript + Prisma.
- `packages/shared`: tipos, schemas Zod y calculo de precios.
- PostgreSQL.
- S3 compatible remoto para imagenes de producto.
- Docker Compose para desarrollo y produccion.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Completa credenciales S3 reales: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.
3. Cambia `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `SESSION_SECRET`.

Los compose de desarrollo y produccion fuerzan `UPLOAD_DRIVER=s3`; las imagenes de producto se guardan bajo `products/*` en S3 y no se montan ni se sirven desde `uploads/` locales.

## Desarrollo con Docker

```powershell
docker compose --env-file .env -f docker-compose.dev.yml up --build
```

Luego abre:

- Web: `http://localhost:5174`
- API health: `http://localhost:4000/api/health`

El servicio `api` espera a PostgreSQL, aplica las migraciones versionadas con Prisma y ejecuta el seed antes de arrancar el servidor dev. En volumenes ya inicializados, Prisma no reaplica migraciones existentes; el seed vuelve a sincronizar el admin y los datos demo.

Si necesitas correrlos manualmente:

```powershell
docker compose --env-file .env -f docker-compose.dev.yml exec api pnpm --filter @artenova/api db:deploy
docker compose --env-file .env -f docker-compose.dev.yml exec api pnpm --filter @artenova/api db:seed
```

## Produccion con Docker

```powershell
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
docker compose --env-file .env -f docker-compose.prod.yml exec api pnpm --filter @artenova/api db:deploy
docker compose --env-file .env -f docker-compose.prod.yml exec api pnpm --filter @artenova/api db:seed
```

El compose de produccion expone HTTP en el puerto `90`; por ahora se accede con `http://IP_DEL_SERVIDOR:90`.
Si quieres fijar la IP en el entorno de produccion, define `PROD_APP_BASE_URL=http://IP_DEL_SERVIDOR:90` y `PROD_API_BASE_URL=http://IP_DEL_SERVIDOR:90/api`.
El API usa `WEB_INTERNAL_BASE_URL` para leer el `index.html` del servicio web e inyectar Open Graph en URLs de producto; en Docker Compose queda como `http://web`.

## Pruebas

```powershell
pnpm test
pnpm --filter @artenova/web e2e
```

No se ejecutaron builds locales en esta implementacion por la instruccion del proyecto.
