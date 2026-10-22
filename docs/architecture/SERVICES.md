# Services

| Service                                 | Owns                                                                                      | Does not own                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| [API](../../apps/api/AGENTS.md)         | HTTP endpoints, request validation, MySQL writes, scrape scheduling, BullMQ response jobs | Fetching InSIS HTML           |
| [Web](../../apps/web/AGENTS.md)         | Course search UI, filters, timetable, browser persistence                                 | Direct MySQL or Redis access  |
| [Scraper](../../apps/scraper/AGENTS.md) | InSIS HTTP requests and HTML extraction, BullMQ request jobs                              | Schedulers or database writes |
| [MCP](../../apps/mcp/AGENTS.md)         | Tools, resources, prompts, MySQL-backed public data access                                | API HTTP calls or scrape jobs |

MySQL stores course and study-plan data. Redis backs BullMQ queues, sessions, and cache. Production Redis uses a persistent volume with AOF; local Redis uses the [local Compose configuration](../../docker-compose.local.yml).

The deployed web image is served by Nginx. Traefik, from the host's ingress (Infrastructure's on a shared host, this repository's [`deployment/ingress`](../../deployment/ingress/README.md) on a dedicated server), handles public routing and TLS. See [container topology](CONTAINERS.md) and [runbooks](../runbooks/deploy-and-release.md).
