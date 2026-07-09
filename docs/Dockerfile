FROM node:22-alpine AS base
RUN npm install -g pnpm@11.8.0 turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @kreditozrouti/docs --docker

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
RUN pnpm turbo run build --filter=@kreditozrouti/docs

FROM nginx:stable-alpine AS runner
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/docs/.vitepress/dist /usr/share/nginx/html
COPY ./docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
