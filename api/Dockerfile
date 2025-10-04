# Build Stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json ./

RUN npm install --include=dev

COPY . .

RUN npm run prisma:generate

RUN npm run build

RUN npm prune --omit=dev

RUN mkdir -p ./uploads


# Production Stage
FROM gcr.io/distroless/nodejs24-debian12

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

COPY --from=builder /usr/src/app/uploads ./uploads

EXPOSE 80

CMD ["dist/src/index.js"]
