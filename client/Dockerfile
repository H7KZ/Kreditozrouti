FROM node:22-alpine AS base
RUN npm install -g pnpm@11.8.0 turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @kreditozrouti/client --docker

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
COPY --from=pruner /app/packages/style/ ./packages/style/
COPY --from=pruner /app/packages/core/src/ ./packages/core/src/
COPY --from=pruner /app/packages/types/src/ ./packages/types/src/
RUN pnpm install --frozen-lockfile
# Build with placeholder values replaced at container start via docker-entrypoint.sh
ENV VITE_API_URL="__VITE_API_URL_PLACEHOLDER__"
ENV VITE_FARO_COLLECTOR_URL="__VITE_FARO_COLLECTOR_URL_PLACEHOLDER__"
ENV VITE_APP_VERSION="__VITE_APP_VERSION_PLACEHOLDER__"
ENV VITE_APP_ENV="__VITE_APP_ENV_PLACEHOLDER__"
ENV VITE_UMAMI_WEBSITE_ID="__VITE_UMAMI_WEBSITE_ID_PLACEHOLDER__"
ENV VITE_UMAMI_SRC="__VITE_UMAMI_SRC_PLACEHOLDER__"
RUN pnpm turbo run build --filter=@kreditozrouti/client

FROM nginx:stable-alpine AS runner
ENV PORT=80
ENV VITE_API_URL="/api"
ENV VITE_FARO_COLLECTOR_URL=""
ENV VITE_APP_VERSION="latest"
ENV VITE_APP_ENV="production"
ENV VITE_UMAMI_WEBSITE_ID=""
ENV VITE_UMAMI_SRC=""

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY ./client/nginx.conf /etc/nginx/templates/default.conf.template
COPY ./client/docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
