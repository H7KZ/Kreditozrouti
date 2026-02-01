# Build Stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/client

COPY ./client/package.json ./
RUN npm install

COPY ./client/ ./

# "Workspaces" setup
COPY ./api/src/ /usr/src/api/src/
COPY ./scraper/src/ /usr/src/scraper/src/

# Create a symlink so files in /usr/src/api can find modules in /usr/src/client/node_modules
RUN mkdir -p /usr/src/api/node_modules
RUN ln -s /usr/src/client/node_modules/* /usr/src/api/node_modules/ || true

# Create a symlink so files in /usr/src/scraper can find modules in /usr/src/client/node_modules
RUN mkdir -p /usr/src/scraper/node_modules
RUN ln -s /usr/src/client/node_modules/* /usr/src/scraper/node_modules/ || true

# Build with placeholder values that will be replaced at runtime
# These placeholders are unique strings that won't appear in normal code
ENV VITE_API_URL="__VITE_API_URL_PLACEHOLDER__"
ENV VITE_SENTRY_DSN="__VITE_SENTRY_DSN_PLACEHOLDER__"
ENV VITE_SENTRY_RELEASE="__VITE_SENTRY_RELEASE_PLACEHOLDER__"

RUN npm run build

# --------------------------------------------------------------------
# Production Stage
FROM nginx:stable-alpine AS production

ENV PORT=80

# Runtime environment variables (with defaults)
ENV VITE_API_URL="/api"
ENV VITE_SENTRY_DSN=""
ENV VITE_SENTRY_RELEASE="latest"

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /usr/src/client/dist /usr/share/nginx/html

COPY ./client/nginx.conf /etc/nginx/templates/default.conf.template

# Copy the entrypoint script for runtime env injection
COPY ./client/docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
