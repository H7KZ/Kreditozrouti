# Local development

## Prerequisites

- Node.js 24 (the version used in CI), Corepack, and pnpm (version pinned in the root `package.json`)
- Docker with Compose for MySQL and Redis
- Make and Bash for the root convenience commands

## Start

```bash
cp .env.example .env
make run-local-docker
make install
make dev
```

Set local values in `.env` before starting the services. The template lists all available variables. The API runs database migrations and seeds on startup. `make dev` starts the API, web app, scraper, MCP server, and shared-package watchers through Turbo.

| Service | Local address |
| --- | --- |
| Web | http://localhost:45173 |
| API | http://localhost:40080 |
| MCP | http://localhost:3000 |
| phpMyAdmin | http://localhost:48080 |
| MySQL | `localhost:43306` |
| Redis | `localhost:46379` |

To run one service, use `pnpm --filter=@kreditozrouti/api run dev`, replacing `api` with `web`, `scraper`, or `mcp` as needed. `make stop-local-docker` stops the local containers.

## Common commands

| Command | Purpose |
| --- | --- |
| `make lint` | Lint workspaces |
| `make format` | Format workspaces |
| `make type-check` | Check TypeScript |
| `make build` | Build workspaces |
| `pnpm boundaries` | Check core, web, and MCP import boundaries |
| `make verify` | Run the local CI checks, including existing tests |
| `make build-docker-images` | Build service images locally |
| `make clear-redis` | Flush the local Redis database, including queues and sessions |

`VITE_*` values are bundled into the web build. Restart Vite after changing local values; rebuild for a production change. A new build-time variable must also be declared in `turbo.json`.

For API commands and database details, see the [API guide](../api/README.md). For production configuration, see the [deployment guide](../deployment/README.md).
