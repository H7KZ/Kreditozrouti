.PHONY: install dev format lint \
		type-check build preview \
		build-docker-images run-local-docker \
		stop-local-docker clear-redis

run-local-docker:
	docker compose -f docker-compose.local.yml up -d

stop-local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans

clear-redis:
	docker exec kreditozrouti-redis redis-cli FLUSHDB

install:
	npm install && \
	npm install -g concurrently && \
	npm install -g dotenv-cli

dev:
	concurrently \
	'cd api && npm run dev' \
	'cd client && npm run dev' \
	'cd scraper && npm run dev' \
	--names "API,CLIENT,SCRAPER" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold"

format:
	concurrently \
	'cd api && npm run format' \
	'cd client && npm run format' \
	'cd scraper && npm run format' \
	--names "API,CLIENT,SCRAPER" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold"

lint:
	concurrently \
	'cd api && npm run lint' \
	'cd client && npm run lint' \
	'cd scraper && npm run lint' \
	--names "API,CLIENT,SCRAPER" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold"

type-check:
	concurrently \
	'cd api && npm run type-check' \
	'cd client && npm run type-check' \
	'cd scraper && npm run type-check' \
	--names "API,CLIENT,SCRAPER" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold"

build:
	concurrently \
	'cd api && npm run build' \
	'cd client && npm run build' \
	'cd scraper && npm run build' \
	--names "API,CLIENT,SCRAPER" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold"

preview:
	concurrently \
	'cd api && npm run preview' \
	'cd client && npm run preview' \
	'cd scraper && npm run preview' \
	--names "API,CLIENT,SCRAPER" \
	--prefix-colors "bgBlue.bold,bgGreen.bold,bgMagenta.bold"

build-docker-images:
	docker buildx build -t kreditozrouti-api -f ./api/Dockerfile . && \
	docker buildx build -t kreditozrouti-client -f ./client/Dockerfile . && \
	docker buildx build -t kreditozrouti-scraper -f ./scraper/Dockerfile .
