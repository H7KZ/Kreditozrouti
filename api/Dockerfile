# Build Stage
FROM node:26-alpine AS builder

WORKDIR /usr/src

COPY ./package.json ./package-lock.json ./
COPY ./api/package.json ./api/
RUN npm ci -w api

WORKDIR /usr/src/api

COPY ./api/ ./

# Workspaces: make scraper and shared source visible for cross-package type imports
COPY ./scraper/src/ /usr/src/scraper/src/
COPY ./shared/ /usr/src/shared/
RUN mkdir -p /usr/src/scraper/node_modules && \
    ln -s /usr/src/node_modules/* /usr/src/scraper/node_modules/ || true

RUN npm run build && cd /usr/src && npm prune --omit=dev -w api

# --------------------------------------------------------------------
# Production Stage
FROM node:26-alpine

RUN apk add --no-cache curl && \
    addgroup -S api && adduser -S api -G api

WORKDIR /usr/src/api

COPY --from=builder --chown=api:api /usr/src/api/dist ./dist
COPY --from=builder --chown=api:api /usr/src/node_modules ./node_modules

RUN mkdir -p /usr/src/uploads && chown api:api /usr/src/uploads

USER api

EXPOSE 80
CMD ["node", "--require", "./dist/api/src/telemetry.js", "dist/api/src/index.js"]
