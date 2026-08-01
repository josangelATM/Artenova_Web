# Artenova Web

Tienda administrable para Artenova, taller creativo de corte y grabado laser. El flujo v1 permite publicar productos personalizados, mostrar precios base y escalas por cantidad, recibir pedidos de clientes invitados y gestionar el contacto desde un panel admin.

## Stack

- Monorepo pnpm.
- `apps/web`: Vite + React + TypeScript + Material UI.
- `apps/api`: Express + TypeScript + Prisma.
- `packages/shared`: tipos, schemas Zod y calculo de precios.
- PostgreSQL.
- S3 compatible remoto para imagenes subidas.
- Upload local en desarrollo para poder probar sin credenciales externas.
- Docker Compose para desarrollo y produccion.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Completa credenciales S3 reales: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.
3. Cambia `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `SESSION_SECRET`.

En desarrollo, `.env.example` usa `UPLOAD_DRIVER=local` y guarda archivos en `uploads/`. Para produccion usa `UPLOAD_DRIVER=s3` con credenciales reales.

## Desarrollo con Docker

```powershell
docker compose --env-file .env -f docker-compose.dev.yml up --build
```

Luego abre:

- Web: `http://localhost:5173`
- API health: `http://localhost:4000/api/health`

En una terminal separada, despues de que PostgreSQL este listo:

```powershell
docker compose --env-file .env -f docker-compose.dev.yml exec api pnpm --filter @artenova/api db:migrate
docker compose --env-file .env -f docker-compose.dev.yml exec api pnpm --filter @artenova/api db:seed
```

## Produccion con Docker

```powershell
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
docker compose --env-file .env -f docker-compose.prod.yml exec api pnpm --filter @artenova/api db:deploy
docker compose --env-file .env -f docker-compose.prod.yml exec api pnpm --filter @artenova/api db:seed
```

El compose de produccion expone HTTP en el puerto `80`; HTTPS queda fuera de v1.

## Pruebas

```powershell
pnpm test
pnpm --filter @artenova/web e2e
```

No se ejecutaron builds locales en esta implementacion por la instruccion del proyecto.
