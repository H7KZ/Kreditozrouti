# Local development

## Prerequisites

- Node.js 24 (the version used in CI), Corepack, and pnpm (version pinned in the root `package.json`)
- Docker with Compose for MySQL and Redis
- Make and Bash for the root convenience commands

## Start

```bash
cp .env.example .env
make install
make dev
```

Set local values in `.env` before starting the services. The template lists all available variables. `make dev` starts only MySQL and Redis in Docker, then runs the API, web app, scraper, MCP server, and shared-package watchers on the host through Turbo. The API runs database migrations and seeds on startup.

For a full containerized stack behind local Traefik, use `make up` instead of `make dev`. It builds and starts the API, web, scraper, MCP, MySQL, Redis, and Traefik. `make admin` starts phpMyAdmin when needed; it is stopped by default.

| Service           | Host-based `make dev`                     | Full Compose `make up`                    |
| ----------------- | ----------------------------------------- | ----------------------------------------- |
| Web               | http://localhost:45173                    | http://localhost/                         |
| API               | http://localhost:40080                    | http://localhost/api                      |
| MCP               | http://localhost:3000/mcp                 | http://localhost/mcp                      |
| Traefik dashboard | -                                         | http://localhost:8080/dashboard/          |
| phpMyAdmin        | http://localhost:48080 after `make admin` | http://localhost:48080 after `make admin` |
| MySQL             | `localhost:43306` (`MYSQL_HOST_PORT`)     | `localhost:43306` (`MYSQL_HOST_PORT`)     |
| Redis             | `localhost:46379` (`REDIS_HOST_PORT`)     | `localhost:46379` (`REDIS_HOST_PORT`)     |

If another local project already uses 43306 or 46379, set `MYSQL_HOST_PORT` / `REDIS_HOST_PORT` in `.env` and point `MYSQL_URI` / `REDIS_URI` at the new ports. The URIs take no query parameters; mysql2 warns on unknown ones such as `sslmode` or `schema`.

To run one service, use `pnpm --filter=@kreditozrouti/api run dev`, replacing `api` with `web`, `scraper`, or `mcp` as needed. `make down` stops the local containers.

## Common commands

| Command                       | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `make format`                 | Format workspaces                                             |
| `make build`                  | Build workspaces                                              |
| `pnpm verify` / `make verify` | Run lint, boundaries, tests, type-check, and builds           |
| `make clear`                  | Flush the local Redis database, including queues and sessions |

`VITE_*` values are bundled into the web build. Restart Vite after changing local values; rebuild for a production change. A new build-time variable must also be declared in `turbo.json`.

For API commands and database details, see the [API guide](../api/README.md). For production configuration, see the [deployment guide](../deployment/README.md).
