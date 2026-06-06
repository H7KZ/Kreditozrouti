.PHONY: install dev format lint \
		type-check build preview \
		build-docker-images run-local-docker \
		stop-local-docker clear-redis \
		scrape-catalog scrape-catalog-turbo scrape-catalog-normal \
		scrape-studyplans scrape-studyplans-turbo scrape-studyplans-normal \
		scrape-academic-schedules

# API_URL and COMMAND_TOKEN can be overridden:
#   make scrape-catalog API_URL=https://api.kreditozrouti.cz COMMAND_TOKEN=mytoken
API_URL        ?= http://localhost:40080
COMMAND_TOKEN  ?= $(error COMMAND_TOKEN is required. Run: make scrape-catalog COMMAND_TOKEN=mytoken)

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

scrape-catalog:
	bash scripts/scrape.sh $(API_URL) catalog $(COMMAND_TOKEN)

scrape-studyplans:
	bash scripts/scrape.sh $(API_URL) studyplans $(COMMAND_TOKEN)

scrape-academic-schedules:
	bash scripts/scrape.sh $(API_URL) academic-schedules $(COMMAND_TOKEN)

build-docker-images:
	docker buildx build -t kreditozrouti-api -f ./api/Dockerfile . && \
	docker buildx build -t kreditozrouti-client -f ./client/Dockerfile . && \
	docker buildx build -t kreditozrouti-scraper -f ./scraper/Dockerfile .
