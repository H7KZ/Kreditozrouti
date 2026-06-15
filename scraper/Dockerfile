# Build Stage
FROM node:26-alpine AS builder

WORKDIR /usr/src

COPY ./package.json ./package-lock.json ./
COPY ./scraper/package.json ./scraper/
RUN npm ci -w scraper

WORKDIR /usr/src/scraper

COPY ./scraper/ ./

# Workspaces: make shared source visible for cross-package type imports
COPY ./shared/ /usr/src/shared/

RUN npm run build && cd /usr/src && npm prune --omit=dev -w scraper

# --------------------------------------------------------------------
# Production Stage
FROM node:26-alpine

# Alpine system Chromium — avoids downloading a second browser binary at build time
# and works on musl/Alpine without glibc compatibility shims
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /usr/src/scraper

COPY --from=builder /usr/src/scraper/dist ./dist
COPY --from=builder /usr/src/node_modules ./node_modules

CMD ["node", "--require", "./dist/scraper/src/telemetry.js", "dist/scraper/src/index.js"]
