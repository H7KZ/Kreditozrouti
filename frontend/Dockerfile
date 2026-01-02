# Build Stage
FROM node:24-alpine AS builder


WORKDIR /usr/src/frontend

COPY ./frontend/package.json ./
RUN npm install

COPY ./frontend/ ./
COPY ./api/src/ /usr/src/api/src/

RUN npm run build

# --------------------------------------------------------------------
# Production Stage
FROM nginx:stable-alpine AS production


ENV PORT=80

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /usr/src/frontend/dist /usr/share/nginx/html

COPY ./frontend/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
