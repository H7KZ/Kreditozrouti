# Build Stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/client

COPY ./client/package.json ./package-lock.json ./
RUN npm ci

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
ENV VITE_API_COMMAND_TOKEN="__VITE_API_COMMAND_TOKEN_PLACEHOLDER__"
ENV VITE_FARO_COLLECTOR_URL="__VITE_FARO_COLLECTOR_URL_PLACEHOLDER__"
ENV VITE_APP_VERSION="__VITE_APP_VERSION_PLACEHOLDER__"
ENV VITE_UMAMI_WEBSITE_ID="__VITE_UMAMI_WEBSITE_ID_PLACEHOLDER__"

RUN npm run build

# --------------------------------------------------------------------
# Production Stage
FROM nginx:stable-alpine

ENV PORT=80
ENV VITE_API_URL="/api"
ENV VITE_API_COMMAND_TOKEN=""
ENV VITE_FARO_COLLECTOR_URL=""
ENV VITE_APP_VERSION="latest"
ENV VITE_UMAMI_WEBSITE_ID=""

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /usr/src/client/dist /usr/share/nginx/html
COPY ./client/nginx.conf /etc/nginx/templates/default.conf.template
COPY ./client/docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
