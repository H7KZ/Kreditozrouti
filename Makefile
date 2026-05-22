.PHONY: install dev dev-api dev-client dev-scraper format lint type-check build preview \
        build-docker-images run-local-docker stop-local-docker clear-redis

run-local-docker:
	docker compose -f docker-compose.local.yml up -d

stop-local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans

clear-redis:
	docker exec kreditozrouti-redis redis-cli FLUSHDB

install:
	pnpm -r install && \
	pnpm install -g dotenv-cli

dev:
	pnpm -r --parallel run dev

dev-api:
	cd api && \
	pnpm install && \
	pnpm run dev

dev-scraper:
	cd scraper && \
	pnpm install && \
	pnpm run dev

dev-client:
	cd client && \
	pnpm install && \
	pnpm run dev

format:
	pnpm -r --parallel run format

lint:
	pnpm -r --parallel run lint

type-check:
	pnpm -r --parallel run type-check

build:
	pnpm -r --parallel run build

preview:
	pnpm -r --parallel run preview

build-docker-images:
	docker buildx build -t kreditozrouti-api -f ./api/Dockerfile . && \
	docker buildx build -t kreditozrouti-client -f ./client/Dockerfile . && \
	docker buildx build -t kreditozrouti-scraper -f ./scraper/Dockerfile .
