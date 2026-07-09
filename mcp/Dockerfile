FROM node:22-alpine AS base
RUN apk add --no-cache curl
RUN npm install -g pnpm@11.8.0 turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @kreditozrouti/mcp --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@kreditozrouti/mcp
RUN pnpm prune --prod --no-optional

FROM node:22-alpine AS runner
RUN apk add --no-cache curl && \
    addgroup -S mcp && \
    adduser -S mcp -G mcp
WORKDIR /app
COPY --from=builder --chown=mcp:mcp /app .
USER mcp
WORKDIR /app/mcp
EXPOSE 3000
CMD ["node", "dist/index.js"]
