# Build Stage
FROM node:18-alpine AS builder


WORKDIR /usr/src/frontend

COPY ./frontend/package.json /usr/src/frontend/
RUN npm install --include=dev

COPY ./frontend/ /usr/src/frontend/


# "Workspaces" setup
COPY ./api/src/ /usr/src/api/src/


RUN npm run build


# --------------------------------------------------------------------
# Production Stage
FROM nginx:stable-alpine AS production


COPY --from=builder /usr/src/frontend/dist /usr/share/nginx/html


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
