.PHONY: local-docker local api scraper frontend format lint build build-docker

local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans && \
	docker compose -f docker-compose.local.yml build --pull --no-cache && \
	docker compose -f docker-compose.local.yml up -d

local-install:
	pnpm -r install --filter=!./scripts/* && \
	pnpm install -g dotenv-cli && \
	pnpm -r prisma generate

local-run:
	pnpm -r --parallel run dev

local-migrations:
	cd api && \
	dotenv -e ../.env -- pnpm prisma migrate dev && \
	dotenv -e ../.env -- pnpm prisma db seed

local: local-docker local-install local-migrations local-run

clear-redis:
	docker exec diar-4fis-redis redis-cli FLUSHDB

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
