# Build Stage
FROM node:24-alpine AS builder


WORKDIR /usr/src/api

COPY ./api/package.json /usr/src/api/
RUN npm install --include=dev

COPY ./api/ /usr/src/api/


# "Workspaces" setup
COPY ./scraper/src/ /usr/src/scraper/src/


RUN npm run build
RUN npm prune --omit=dev


RUN mkdir -p /usr/src/uploads


# --------------------------------------------------------------------
# Production Stage
FROM node:24-alpine


RUN apk add --no-cache curl

WORKDIR /usr/src/api

COPY --from=builder /usr/src/api/dist /usr/src/api/dist
COPY --from=builder /usr/src/api/node_modules /usr/src/api/node_modules
COPY --from=builder /usr/src/uploads /usr/src/uploads

EXPOSE 80
CMD ["node", "dist/api/src/index.js"]
