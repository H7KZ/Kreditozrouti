FROM node:22-alpine AS base
RUN apk add --no-cache curl
RUN npm install -g pnpm@11.8.0 turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @kreditozrouti/api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/.pnpmfile.cjs ./.pnpmfile.cjs
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/.pnpmfile.cjs ./.pnpmfile.cjs
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@kreditozrouti/api
RUN pnpm --filter=@kreditozrouti/api --prod deploy --legacy /app/deploy

FROM node:22-alpine AS runner
RUN apk add --no-cache curl && \
    addgroup -S api && \
    adduser -S api -G api
WORKDIR /app
COPY --from=builder --chown=api:api /app/deploy .
RUN mkdir -p /app/uploads && chown api:api /app/uploads
USER api
EXPOSE 80
CMD ["node", "--require", "./dist/api/src/telemetry.js", "dist/api/src/index.js"]
