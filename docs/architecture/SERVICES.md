# Services

| Service | Owns | Does not own |
|---------|------|--------------|
| [API](../../api/AGENTS.md) | HTTP endpoints, request validation, MySQL writes, scrape scheduling, BullMQ response jobs | Fetching InSIS HTML |
| [Web](../../web/AGENTS.md) | Course search UI, filters, timetable, browser persistence | Direct MySQL or Redis access |
| [Scraper](../../scraper/AGENTS.md) | InSIS HTTP requests and HTML extraction, BullMQ request jobs | Schedulers or database writes |
| [MCP](../../mcp/AGENTS.md) | Tools, resources, prompts, MySQL-backed public data access | API HTTP calls or scrape jobs |

MySQL stores course and study-plan data. Redis backs BullMQ queues, sessions, and cache. Production Redis uses a persistent volume with AOF; local Redis uses the [local Compose configuration](../../docker-compose.local.yml).

The deployed web image is served by Nginx. A shared Traefik instance owned by the separate Infrastructure repository handles public routing and TLS. See [container topology](CONTAINERS.md) and [deployment](../deployment/README.md).
