FROM node:22-alpine AS builder

WORKDIR /usr/src

# Install all workspace deps
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY mcp/package*.json ./mcp/

RUN npm ci

# Build packages/core first
COPY packages/core/ ./packages/core/
RUN npm run build -w packages/core

# Build mcp
COPY mcp/ ./mcp/
RUN npm run build -w mcp

FROM node:22-alpine

RUN apk add --no-cache curl && \
    addgroup -S mcp && adduser -S mcp -G mcp

WORKDIR /usr/src/mcp

COPY --from=builder --chown=mcp:mcp /usr/src/mcp/dist ./dist
COPY --from=builder --chown=mcp:mcp /usr/src/mcp/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /usr/src/mcp/package.json ./package.json

USER mcp

EXPOSE 3000
CMD ["node", "dist/index.js"]
