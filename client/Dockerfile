# Build Stage
FROM node:24-alpine AS builder


WORKDIR /usr/src/client

COPY ./client/package.json ./
RUN npm install

COPY ./client/ ./

# "Workspaces" setup
COPY ./api/src/ /usr/src/api/src/
COPY ./scraper/src/ /usr/src/scraper/src/

# Create a symlink so files in /usr/src/api can find modules in /usr/src/client/node_modules
RUN mkdir -p /usr/src/api/node_modules
RUN ln -s /usr/src/client/node_modules/* /usr/src/api/node_modules/ || true

# Create a symlink so files in /usr/src/scraper can find modules in /usr/src/client/node_modules
RUN mkdir -p /usr/src/scraper/node_modules
RUN ln -s /usr/src/client/node_modules/* /usr/src/scraper/node_modules/ || true


RUN npm run build

# --------------------------------------------------------------------
# Production Stage
FROM nginx:stable-alpine AS production


ENV PORT=80

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /usr/src/client/dist /usr/share/nginx/html

COPY ./client/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
