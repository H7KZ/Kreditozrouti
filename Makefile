.PHONY: local-docker local api scraper frontend format lint build build-docker

local-docker:
	docker compose -f docker-compose.local.yml down --remove-orphans && \
	docker compose -f docker-compose.local.yml build --pull --no-cache && \
	docker compose -f docker-compose.local.yml up -d

local-packages:
	pnpm -r install --filter=!./scripts && \
	pnpm install -g dotenv-cli && \
	pnpm -r prisma generate && \
	pnpm -r --parallel run dev

local: local-packages local-docker

local-migrations:
	cd api && \
	dotenv -e ../.env -- pnpm prisma migrate dev && \
	dotenv -e ../.env -- pnpm prisma db seed

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

preview:
	pnpm -r --parallel run preview
