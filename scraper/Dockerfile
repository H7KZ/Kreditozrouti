# Build Stage
FROM node:24-alpine AS builder


WORKDIR /usr/src/scraper

COPY ./scraper/package.json /usr/src/scraper/
RUN npm install --include=dev

COPY ./scraper/ /usr/src/scraper/


# "Workspaces" setup
COPY ./api/src/ /usr/src/api/src/


RUN npm run build
RUN npm prune --omit=dev


# --------------------------------------------------------------------
# Production Stage
FROM gcr.io/distroless/nodejs24-debian12


WORKDIR /usr/src/scraper

COPY --from=builder /usr/src/scraper/dist /usr/src/scraper/dist
COPY --from=builder /usr/src/scraper/node_modules /usr/src/scraper/node_modules


CMD ["dist/scraper/src/index.js"]
