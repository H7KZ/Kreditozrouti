# Build Stage
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /usr/src/client

COPY ./client/package.json ./client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --shamefully-hoist

COPY ./client/ ./

# Workspaces: make api/scraper/shared source visible for cross-package type imports
COPY ./api/src/ /usr/src/api/src/
COPY ./scraper/src/ /usr/src/scraper/src/
COPY ./shared/ /usr/src/shared/
RUN mkdir -p /usr/src/api/node_modules /usr/src/scraper/node_modules && \
    ln -s /usr/src/client/node_modules/* /usr/src/api/node_modules/ || true && \
    ln -s /usr/src/client/node_modules/* /usr/src/scraper/node_modules/ || true

# Build with placeholder values replaced at container start via docker-entrypoint.sh
ENV VITE_API_URL="__VITE_API_URL_PLACEHOLDER__"
ENV VITE_SENTRY_DSN="__VITE_SENTRY_DSN_PLACEHOLDER__"
ENV VITE_SENTRY_RELEASE="__VITE_SENTRY_RELEASE_PLACEHOLDER__"

RUN pnpm run build

# --------------------------------------------------------------------
# Production Stage
FROM nginx:stable-alpine

ENV PORT=80
ENV VITE_API_URL="/api"
ENV VITE_SENTRY_DSN=""
ENV VITE_SENTRY_RELEASE="latest"

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /usr/src/client/dist /usr/share/nginx/html
COPY ./client/nginx.conf /etc/nginx/templates/default.conf.template
COPY ./client/docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
