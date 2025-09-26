# --- Stage 1: Builder ---
# Use a slim base image like Alpine for the build environment.
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Set NODE_ENV to production to ensure only production dependencies are installed by default
# if you were to run `npm ci`. We will install all for the build, then prune.
ENV NODE_ENV=production

# Copy package files and Prisma schema first to leverage Docker layer caching.
# This prevents re-installing dependencies if only source code changes.
COPY package.json ./
COPY prisma/schema ./prisma/schema

# Install ALL dependencies (including dev dependencies like 'prisma')
# needed to run the build and generate commands.
RUN npm install --include=dev

# Copy the rest of the application source code.
COPY . .

# Generate the Prisma client based on your schema.
RUN npm run prisma:generate

# Build the application.
RUN npm run build

# After building, remove the development dependencies to shrink the node_modules folder.
RUN npm prune --omit=dev

# Create the uploads directory.
RUN mkdir -p ./uploads


# --- Stage 2: Production ---
# Use a distroless image for the smallest and most secure production environment.
# It contains only your application and its runtime dependencies.
FROM gcr.io/distroless/nodejs24-debian12

WORKDIR /usr/src/app

# Copy the essential artifacts from the builder stage.
# This includes the compiled code (dist) and the pruned production dependencies (node_modules).
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

# The 'uploads' directory should ideally be managed by a persistent volume in production.
# For the image, we create an empty directory.
COPY --from=builder /usr/src/app/uploads ./uploads

EXPOSE 9000

# The CMD must call 'node' directly, as distroless images do not have 'npm' or a shell.
CMD ["dist/index.js"]
