# Build Stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/scraper

COPY ./scraper/package.json ./package-lock.json ./
RUN npm ci

COPY ./scraper/ ./

# Workspaces: make shared source visible for cross-package type imports
COPY ./shared/ /usr/src/shared/

RUN npm run build && npm prune --omit=dev

# --------------------------------------------------------------------
# Production Stage
FROM node:24-alpine

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
COPY --from=builder /usr/src/scraper/node_modules ./node_modules

CMD ["node", "dist/scraper/src/index.js"]
