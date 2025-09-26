
dev:
	docker compose -f docker-compose.dev.yaml down --remove-orphans && \
    docker compose -f docker-compose.dev.yaml build --pull --no-cache && \
    docker compose -f docker-compose.dev.yaml up -d
