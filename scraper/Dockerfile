# Build Stage
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /usr/src/scraper

COPY ./scraper/package.json ./scraper/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --shamefully-hoist

COPY ./scraper/ ./

# Workspaces: make shared source visible for cross-package type imports
COPY ./shared/ /usr/src/shared/

RUN pnpm run build && pnpm prune --prod

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

# Tell Puppeteer to use the system Chromium instead of its bundled binary
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/scraper

COPY --from=builder /usr/src/scraper/dist ./dist
COPY --from=builder /usr/src/scraper/node_modules ./node_modules

CMD ["node", "dist/index.js"]
