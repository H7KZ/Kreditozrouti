.PHONY: install dev dev-api dev-frontend dev-scraper format lint build preview build-docker-images run-local-docker clear-redis

run-local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans && \
	docker compose -f docker-compose.local.yml build --pull --no-cache && \
	docker compose -f docker-compose.local.yml up -d

clear-redis:
	docker exec diar-4fis-redis redis-cli FLUSHDB

install:
	pnpm -r install && \
	pnpm -r postinstall && \
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

dev-frontend:
	cd frontend && \
	pnpm install && \
	pnpm run dev

format:
	pnpm -r --parallel run format

lint:
	pnpm -r --parallel run lint

build:
	pnpm -r --parallel run build

preview:
	pnpm -r --parallel run preview

build-docker-images:
	docker build -t diar-4fis-api -f ./api/Dockerfile . && \
	docker build -t diar-4fis-frontend -f ./frontend/Dockerfile . && \
	docker build -t diar-4fis-scraper -f ./scraper/Dockerfile .
