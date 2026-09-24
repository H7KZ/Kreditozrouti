.PHONY: install dev up down logs clear migrate test-regen format verify build

COMPOSE = docker compose -f docker-compose.local.yml

install:
	pnpm install

dev:
	$(COMPOSE) up -d --wait mysql redis
	pnpm turbo run dev

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down --remove-orphans

logs:
	$(COMPOSE) logs -f

clear:
	docker exec kreditozrouti-redis redis-cli FLUSHDB

migrate:
	pnpm --filter @kreditozrouti/api migrate

test-regen:
	pnpm turbo run build
	pnpm --filter=@kreditozrouti/scraper run test:regen
	pnpm --filter=@kreditozrouti/api run test:regen

format:
	pnpm turbo run format

verify:
	pnpm verify

build:
	pnpm build
