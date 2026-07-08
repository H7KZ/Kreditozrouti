# Architecture

> Full reference: [docs/architecture/](architecture/README.md)

| Doc                                         | What it covers                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| [MONOREPO.md](architecture/MONOREPO.md)     | package roles, cross-package import rules, TypeScript path aliases     |
| [SERVICES.md](architecture/SERVICES.md)     | What each service does, responsibilities, why it's a separate process  |
| [DATA_FLOW.md](architecture/DATA_FLOW.md)   | End-to-end: user action → API → BullMQ → Scraper → InSIS → DB → Client |
| [CONTAINERS.md](architecture/CONTAINERS.md) | Docker Compose topology, networks, volumes, local vs production        |

## Packages & Services

| Package / Service | Role                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| `api/`            | Express API — HTTP endpoints, DB writes, job orchestration                     |
| `client/`         | Vue 3 SPA — user interface                                                     |
| `scraper/`        | BullMQ worker — InSIS HTTP scraping                                            |
| `packages/core/`  | `@kreditozrouti/core` — domain types, Kysely DB schema, pure DB-query services |
| `mcp/`            | MCP server — exposes 7 tools over stdio or Streamable HTTP                     |
