.PHONY: dev api scraper frontend format lint build build-docker

dev-docker:
	docker compose -f docker-compose.dev.yaml down --remove-orphans && \
	docker compose -f docker-compose.dev.yaml build --pull --no-cache && \
	docker compose -f docker-compose.dev.yaml up -d

dev:
	docker compose -f docker-compose.dev.yaml down --remove-orphans && \
	docker compose -f docker-compose.dev.yaml build --pull --no-cache && \
	docker compose -f docker-compose.dev.yaml up -d && \
	pnpm -r install && \
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

build-docker:
	docker compose -f docker-compose.prod.yaml build --pull --no-cache
