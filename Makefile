SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.PHONY: install dev format lint type-check build preview test test-regen \
        run-local-docker stop-local-docker clear-redis build-docker-images

# Concurrently label/color sets
NAMES_ALL     := CORE,API,CLIENT,DOCS,SCRAPER,MCP
COLORS_ALL    := bgYellow.bold,bgBlue.bold,bgGreen.bold,bgWhite.bold,bgMagenta.bold,bgCyan.bold
NAMES_NO_DOCS := CORE,API,CLIENT,SCRAPER,MCP
COLORS_NO_DOCS := bgYellow.bold,bgBlue.bold,bgGreen.bold,bgMagenta.bold,bgCyan.bold
NAMES_PREVIEW := API,CLIENT,DOCS
COLORS_PREVIEW := bgBlue.bold,bgGreen.bold,bgWhite.bold

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
	npm install

# Development

# packages/core watches and rebuilds so downstream services pick up changes
dev:
	npx concurrently \
	  "npm run dev -w packages/core" \
	  "npm run dev -w api" \
	  "npm run dev -w client" \
	  "npm run dev -w docs" \
	  "npm run dev -w scraper" \
	  "npm run dev -w mcp" \
	  --names "$(NAMES_ALL)" \
	  --prefix-colors "$(COLORS_ALL)"

# Quality

format:
	npx concurrently \
	  "npm run format -w packages/core" \
	  "npm run format -w api" \
	  "npm run format -w client" \
	  "npm run format -w docs" \
	  "npm run format -w scraper" \
	  "npm run format -w mcp" \
	  --names "$(NAMES_ALL)" \
	  --prefix-colors "$(COLORS_ALL)"

lint:
	npx concurrently \
	  "npm run lint -w packages/core" \
	  "npm run lint -w api" \
	  "npm run lint -w client" \
	  "npm run lint -w docs" \
	  "npm run lint -w scraper" \
	  "npm run lint -w mcp" \
	  --names "$(NAMES_ALL)" \
	  --prefix-colors "$(COLORS_ALL)"

# docs has no type-check script
type-check:
	npx concurrently \
	  "npm run type-check -w packages/core" \
	  "npm run type-check -w api" \
	  "npm run type-check -w client" \
	  "npm run type-check -w scraper" \
	  "npm run type-check -w mcp" \
	  --names "$(NAMES_NO_DOCS)" \
	  --prefix-colors "$(COLORS_NO_DOCS)"

# scraper and api only - they are the only packages with test suites
# scraper must run first: its output feeds the api fixture snapshots
test:
	npm run test -w scraper
	npm run test -w api

test-regen:
	npm run test:regen -w scraper
	npm run test:regen -w api

# Build

build:
	npx concurrently \
	  "npm run build -w packages/core" \
	  "npm run build -w api" \
	  "npm run build -w client" \
	  "npm run build -w docs" \
	  "npm run build -w scraper" \
	  "npm run build -w mcp" \
	  --names "$(NAMES_ALL)" \
	  --prefix-colors "$(COLORS_ALL)"

# scraper preview just runs the dist binary - not useful here
# mcp has no preview (use `start` to run the built server directly)
preview:
	npx concurrently \
	  "npm run preview -w api" \
	  "npm run preview -w client" \
	  "npm run preview -w docs" \
	  --names "$(NAMES_PREVIEW)" \
	  --prefix-colors "$(COLORS_PREVIEW)"
