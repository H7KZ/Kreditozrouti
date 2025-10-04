# Build Stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build

RUN npm prune --omit=dev


# Production Stage
FROM gcr.io/distroless/nodejs24-debian12

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

CMD ["dist/scraper/src/index.js"]
