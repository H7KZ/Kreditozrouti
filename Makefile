.PHONY: install dev format lint \
		type-check build preview \
		build-docker-images run-local-docker \
		stop-local-docker clear-redis \
		scrape-catalog scrape-catalog-turbo scrape-catalog-normal \
		scrape-studyplans scrape-studyplans-turbo scrape-studyplans-normal \
		scrape-academic-schedules \
		test test-regen \
		dev-docs build-docs install-docs

run-local-docker:
	docker compose -f docker-compose.local.yml up -d

stop-local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans

clear-redis:
	docker exec kreditozrouti-redis redis-cli FLUSHDB

install:
	npm install && \
	npm install -g concurrently && \
	npm install -g dotenv-cli && \
	cd docs && npm install

install-docs:
	cd docs && npm install

dev-docs:
	cd docs && npm run dev

build-docs:
	cd docs && npm run build

dev:
	concurrently \
	'cd api && npm run dev' \
	'cd client && npm run dev' \
	'cd docs && npm run dev' \
	'cd scraper && npm run dev' \
	'cd mcp && npm run dev' \
	--names "API,CLIENT,DOCS,SCRAPER,MCP" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgWhite.bold,bgMagenta.bold,bgCyan.bold"

format:
	concurrently \
	'cd api && npm run format' \
	'cd client && npm run format' \
	'cd scraper && npm run format' \
	'cd mcp && npm run format' \
	--names "API,CLIENT,SCRAPER,MCP" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold,bgCyan.bold"

lint:
	concurrently \
	'cd api && npm run lint' \
	'cd client && npm run lint' \
	'cd scraper && npm run lint' \
	'cd mcp && npm run lint' \
	--names "API,CLIENT,SCRAPER,MCP" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold,bgCyan.bold"

test:
	cd scraper && npm run test && \
	cd ../api && npm run test

test-regen:
	cd scraper && npm run test:regen && \
	cd ../api && npm run test:regen

type-check:
	concurrently \
	'cd api && npm run type-check' \
	'cd client && npm run type-check' \
	'cd scraper && npm run type-check' \
	'cd mcp && npm run type-check' \
	--names "API,CLIENT,SCRAPER,MCP" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold,bgCyan.bold"

build:
	concurrently \
	'cd api && npm run build' \
	'cd client && npm run build' \
	'cd docs && npm run build' \
	'cd scraper && npm run build' \
	'cd mcp && npm run build' \
	--names "API,CLIENT,DOCS,SCRAPER,MCP" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgWhite.bold,bgMagenta.bold,bgCyan.bold"

preview:
	concurrently \
	'cd api && npm run preview' \
	'cd client && npm run preview' \
	'cd docs && npm run preview' \
	'cd scraper && npm run preview' \
	--names "API,CLIENT,DOCS,SCRAPER" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgWhite.bold,bgMagenta.bold"

build-docker-images:
	docker buildx build -t kreditozrouti-api -f ./api/Dockerfile . && \
	docker buildx build -t kreditozrouti-client -f ./client/Dockerfile . && \
	docker buildx build -t kreditozrouti-scraper -f ./scraper/Dockerfile . && \
	docker buildx build -t kreditozrouti-mcp -f ./mcp/Dockerfile .
