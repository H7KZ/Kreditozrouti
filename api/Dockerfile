# Build Stage
FROM node:24-alpine AS builder


WORKDIR /usr/src/api

COPY ./api/package.json /usr/src/api/
RUN npm install --include=dev

COPY ./api/ /usr/src/api/

RUN mkdir -p /usr/src/uploads

# "Workspaces" setup
COPY ./scraper/src/ /usr/src/scraper/src/

# Create a symlink so files in /usr/src/scraper can find modules in /usr/src/api/node_modules
RUN mkdir -p /usr/src/scraper/node_modules
RUN ln -s /usr/src/api/node_modules/* /usr/src/scraper/node_modules/ || true


RUN npm run build
RUN npm prune --omit=dev

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
