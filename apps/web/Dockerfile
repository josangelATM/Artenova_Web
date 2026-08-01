FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY packages packages
COPY apps/web apps/web
RUN pnpm install --filter @artenova/web... --frozen-lockfile

FROM base AS dev
CMD ["pnpm", "--filter", "@artenova/web", "dev"]

FROM base AS prod-build
RUN pnpm --filter @artenova/web build

FROM nginx:1.29-alpine AS prod
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=prod-build /app/apps/web/dist /usr/share/nginx/html
