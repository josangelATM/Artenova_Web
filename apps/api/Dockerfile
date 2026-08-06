FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm install --filter @artenova/api... --frozen-lockfile
ENV DATABASE_URL="postgresql://artenova:artenova_dev@localhost:5432/artenova?schema=public"
RUN pnpm --filter @artenova/api db:generate

FROM base AS dev
CMD ["pnpm", "--filter", "@artenova/api", "dev"]

FROM base AS prod
RUN pnpm --filter @artenova/api build
CMD ["sh", "-c", "pnpm --filter @artenova/api db:deploy && pnpm --filter @artenova/api db:seed && pnpm --filter @artenova/api start"]
