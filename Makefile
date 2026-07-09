SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.PHONY: install dev format lint type-check build preview test test-regen \
        run-local-docker stop-local-docker clear-redis build-docker-images

# Infrastructure

run-local-docker:
	docker compose -f docker-compose.local.yml up -d

stop-local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans

clear-redis:
	docker exec kreditozrouti-redis redis-cli FLUSHDB

build-docker-images:
	docker buildx build -t kreditozrouti-api     -f ./api/Dockerfile     . && \
	docker buildx build -t kreditozrouti-client  -f ./client/Dockerfile  . && \
	docker buildx build -t kreditozrouti-docs    -f ./docs/Dockerfile    . && \
	docker buildx build -t kreditozrouti-scraper -f ./scraper/Dockerfile . && \
	docker buildx build -t kreditozrouti-mcp     -f ./mcp/Dockerfile     .

# Dependencies

install:
	pnpm install

# Development

dev:
	pnpm turbo run dev

# Quality

format:
	pnpm turbo run format

lint:
	pnpm turbo run lint

# docs has no type-check script
type-check:
	pnpm turbo run type-check --filter=!@kreditozrouti/docs

# scraper and api only - they are the only packages with test suites
# scraper must run first: its output feeds the api fixture snapshots
test:
	pnpm turbo run build
	pnpm --filter=@kreditozrouti/scraper run test
	pnpm --filter=@kreditozrouti/api run test

test-regen:
	pnpm turbo run build
	pnpm --filter=@kreditozrouti/scraper run test:regen
	pnpm --filter=@kreditozrouti/api run test:regen

# Build

build:
	pnpm turbo run build

# scraper preview just runs the dist binary - not useful here
# mcp has no preview (use `start` to run the built server directly)
preview:
	pnpm turbo run preview --filter=@kreditozrouti/api --filter=@kreditozrouti/client --filter=@kreditozrouti/docs
