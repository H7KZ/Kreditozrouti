# Build Stage
FROM node:24-alpine AS builder


WORKDIR /usr/src/scraper

COPY ./scraper/package.json /usr/src/scraper/
RUN npm install --include=dev

COPY ./scraper/ /usr/src/scraper/


# "Workspaces" setup
# COPY ./api/src/ /usr/src/api/src/


RUN npm run build
RUN npm prune --omit=dev
RUN npx puppeteer browsers install chrome


# --------------------------------------------------------------------
# Production Stage
FROM node:24-alpine


WORKDIR /usr/src/scraper

COPY --from=builder /usr/src/scraper/dist /usr/src/scraper/dist
COPY --from=builder /usr/src/scraper/node_modules /usr/src/scraper/node_modules

CMD ["node", "dist/index.js"]

# "Workspaces" setup
# CMD ["node", "dist/scraper/src/index.js"]
