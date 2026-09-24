# Docker images

The [API](../../api/Dockerfile), [web](../../web/Dockerfile), [scraper](../../scraper/Dockerfile), and [MCP](../../mcp/Dockerfile) use multi-stage builds. Each prunes its Turbo workspace, installs with the frozen pnpm lockfile, builds its package, and copies the production output into a runner image. Node stages use `node:24-alpine`, `pnpm@12.4.1`, and `turbo@2.10.13`; web serves through nginx.

| Service | Runtime | Internal port | Health |
| --- | --- | --- | --- |
| API | Node, non-root | 80 | `GET /health` |
| Web | nginx | 80 | BusyBox `wget` on `127.0.0.1:80` |
| Scraper | Node worker with Chromium | 9101 metrics | Container and scrape checks |
| MCP | Node, non-root | 3000 | `GET /health` |

The API runs database migrations on startup. The scraper serves `/metrics` inside the monitoring network; it has no public route.

## Web runtime configuration

Vite bundles environment values at build time. To reuse one web image across environments, [the Dockerfile](../../web/Dockerfile) embeds placeholders for `VITE_API_URL`, `VITE_FARO_COLLECTOR_URL`, `VITE_APP_VERSION`, `VITE_APP_ENV`, `VITE_UMAMI_WEBSITE_ID`, and `VITE_UMAMI_SRC`. [`docker-entrypoint.sh`](../../web/docker-entrypoint.sh) replaces them from container environment values before nginx starts.

Every placeholder variable must also appear in the root [`turbo.json`](../../turbo.json) `build.env` list. Turbo's strict environment mode otherwise removes it from the build and leaves no token to replace.

## Registry and tags

The build workflow pushes each service to `ghcr.io/<owner>/<repo>/<service>` with an eight-character commit SHA tag and a floating environment tag: `latest` for production or `dev-latest` for development. Deploy and rollback use explicit SHA tags through `API_IMAGE_TAG`, `WEB_IMAGE_TAG`, `SCRAPER_IMAGE_TAG`, and `MCP_IMAGE_TAG`.

Third-party images in Compose use versioned tags. Check the actual [production](../../deployment/production/docker-compose.production.yml), [development](../../deployment/development/docker-compose.development.yml), [monitoring](../../deployment/monitoring/docker-compose.monitoring.yml), and [runner](../../deployment/github-runner/docker-compose.github-runner.yml) files before changing a pin. In particular, MySQL and PostgreSQL image major changes require data migration; the [Umami PostgreSQL 18 runbook](HANDOFF-umami-pg18-migration.md) covers the existing monitoring volume.

Build all four app images locally with `make build-docker-images` from the repository root. Use the project's local Compose stack for integrated checks; standalone `docker run` of API or scraper needs matching MySQL and Redis services.
