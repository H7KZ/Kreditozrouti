FROM node:22-alpine AS base
RUN apk add --no-cache curl
RUN npm install -g pnpm@11.8.0 turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @kreditozrouti/scraper --docker

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
RUN pnpm turbo run build --filter=@kreditozrouti/scraper
RUN CI=true pnpm prune --prod --no-optional

FROM node:22-alpine AS runner
# Alpine system Chromium - avoids downloading a second browser binary at build time
# and works on musl/Alpine without glibc compatibility shims
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont && \
    addgroup -S scraper && \
    adduser -S scraper -G scraper
WORKDIR /app
COPY --from=builder --chown=scraper:scraper /app .
USER scraper
WORKDIR /app/scraper
CMD ["node", "--require", "./dist/scraper/src/telemetry.js", "dist/scraper/src/index.js"]
