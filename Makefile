.PHONY: docker migrations clear-redis install dev api scraper frontend format lint build build-docker-images preview

local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans && \
	docker compose -f docker-compose.local.yml build --pull --no-cache && \
	docker compose -f docker-compose.local.yml up -d

clear-redis:
	docker exec diar-4fis-redis redis-cli FLUSHDB

install:
	pnpm -r install --filter=!./scripts/* && \
	pnpm install -g dotenv-cli

dev:
	pnpm -r --parallel run dev

api:
	cd api && \
	pnpm install && \
	pnpm run dev

scraper:
	cd scraper && \
	pnpm install && \
	pnpm run dev

frontend:
	cd frontend && \
	pnpm install && \
	pnpm run dev

format:
	pnpm -r --parallel run format

lint:
	pnpm -r --parallel run lint

build:
	pnpm -r --parallel run build

build-docker-images:
	docker build -t diar-4fis-api -f ./api/Dockerfile . && \
	docker build -t diar-4fis-api-migrations -f ./api/Dockerfile.migrations . && \
	docker build -t diar-4fis-frontend -f ./frontend/Dockerfile . && \
	docker build -t diar-4fis-scraper -f ./scraper/Dockerfile .

preview:
	pnpm -r --parallel run preview
