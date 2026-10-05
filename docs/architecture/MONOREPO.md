# Monorepo

Kreditožrouti is a [pnpm workspace](../../pnpm-workspace.yaml). `make install` runs a frozen pnpm install; [Turborepo](../../turbo.json) coordinates development, builds, linting, and type checks.

The workspace catalog in `pnpm-workspace.yaml` is the source of truth for versions shared by multiple packages. Their manifests use `catalog:`; the TypeScript override also constrains transitive dependencies.

| Path                                                     | Role                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| [`apps/api/`](../../apps/api/package.json)               | Express HTTP API, MySQL writes, BullMQ orchestration        |
| [`apps/web/`](../../apps/web/package.json)               | Vue 3 SPA served by Nginx in deployment                     |
| [`apps/scraper/`](../../apps/scraper/package.json)       | BullMQ worker that fetches and parses InSIS                 |
| [`apps/mcp/`](../../apps/mcp/package.json)               | MCP tools and resources backed by shared services and MySQL |
| [`packages/types/`](../../packages/types/package.json)   | Domain, HTTP, queue, and database types                     |
| [`packages/core/`](../../packages/core/package.json)     | Reusable domain logic, queue names, and query services      |
| [`packages/logger/`](../../packages/logger/package.json) | Node-only logging used by API and scraper                   |
| [`packages/style/`](../../packages/style/vars.css)       | Shared CSS variables                                        |
| [`deployment/`](../../deployment)                        | Compose stacks and deployment scripts                       |
| [`scripts/`](../../scripts)                              | Repository-specific maintenance scripts                     |

## Boundaries

- Web imports shared DTOs from `@kreditozrouti/types` and browser-safe functions from `@kreditozrouti/core/domain`. It does not import API runtime code, core DB services, or the Node-only logger.
- API, scraper, and MCP use shared types and core services. The scraper has no MySQL connection; it returns scrape results through BullMQ for the API to persist.
- Core stays independent of Express, BullMQ, Redis clients, and the logger. Package-specific aliases are defined in each package's `tsconfig.json`.

See [shared contracts](../shared/README.md), [service responsibilities](SERVICES.md), and [local setup](../engineering/SETUP.md).
