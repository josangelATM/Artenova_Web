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
2. Para desarrollo con Docker puedes usar `UPLOAD_DRIVER=local` y no necesitas credenciales S3.
3. Si vas a usar produccion o S3 en desarrollo, completa `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.
4. Cambia `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `SESSION_SECRET`.

El compose de desarrollo usa `UPLOAD_DRIVER=local` por defecto y monta `./uploads` para persistir imagenes locales. El compose de produccion sigue usando `s3`.

## Desarrollo con Docker

```powershell
docker compose --env-file .env -f docker-compose.dev.yml up --build
```

Luego abre:

- Web: `http://localhost:5174`
- API health: `http://localhost:4000/api/health`

El servicio `api` espera a PostgreSQL y aplica las migraciones versionadas con Prisma antes de arrancar el servidor dev. En volumenes ya inicializados, Prisma no reaplica migraciones existentes.

El seed ya no corre automaticamente ni en desarrollo ni en produccion. Si necesitas ejecutarlo manualmente:

```powershell
docker compose --env-file .env -f docker-compose.dev.yml exec api pnpm --filter @artenova/api db:deploy
docker compose --env-file .env -f docker-compose.dev.yml exec api pnpm --filter @artenova/api db:seed
```

## Produccion con Docker

```powershell
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
```

El compose de produccion expone HTTP en el puerto `90`; define siempre `PROD_APP_BASE_URL` con la URL publica final del sitio antes de levantarlo.
Define tambien `PROD_API_BASE_URL` con la URL publica de la API, normalmente `https://DOMINIO/api` si el API queda detras del mismo dominio.
Estas variables alimentan canonical, Open Graph, robots y sitemap; no deben apuntar a `localhost` en produccion.
El API usa `WEB_INTERNAL_BASE_URL` para leer el `index.html` del servicio web e inyectar Open Graph en URLs de producto; en Docker Compose queda como `http://web`.
Al iniciar el contenedor `api` en produccion se ejecuta automaticamente `db:deploy` antes de levantar el servidor. El seed queda manual.

## Pruebas

```powershell
pnpm test
pnpm --filter @artenova/web e2e
```

No se ejecutaron builds locales en esta implementacion por la instruccion del proyecto.
