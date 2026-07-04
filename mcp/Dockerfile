# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --------------------------------------------------------------------
# Production Stage
FROM node:22-alpine AS runner

RUN apk add --no-cache curl && \
    addgroup -S mcp && adduser -S mcp -G mcp

WORKDIR /app

COPY --chown=mcp:mcp package*.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=mcp:mcp /app/dist ./dist

USER mcp

EXPOSE 3000
CMD ["node", "dist/index.js"]
