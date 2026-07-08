# Build Stage
FROM node:22-alpine AS builder

WORKDIR /usr/src

COPY ./package.json ./package-lock.json ./
COPY ./docs/package.json ./docs/
RUN npm ci -w docs

WORKDIR /usr/src/docs

COPY ./docs/ ./

# Workspaces: make packages/style source visible for cross-package imports
COPY ./packages/style/ /usr/src/packages/style/

RUN npm run build

# --------------------------------------------------------------------
# Production Stage
FROM nginx:stable-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /usr/src/docs/.vitepress/dist /usr/share/nginx/html
COPY ./docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
