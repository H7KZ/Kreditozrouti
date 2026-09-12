# Services

## API (`../../api`)

**Runtime:** Node.js (Express 5)  
**Port:** 40080 (dev) / 443 via Traefik (prod)

### Responsibilities

- Serves all HTTP endpoints consumed by the client
- Validates requests with Zod schemas
- Reads course/study-plan data from MySQL (Kysely query builder)
- Enqueues scraping jobs to `ScraperRequestQueue` (BullMQ → Redis)
- Consumes `ScraperResponseQueue` and persists scraped data to MySQL
- Runs cron schedulers in production (catalog + study plans, nightly)
- Manages sessions via Redis-backed `express-session`
- Caches GET-equivalent POST responses (SHA-256 key, 300 s TTL)

### What it does NOT do

- Does not scrape InSIS directly — that is Scraper's job
- Does not serve static files in production — Nginx (Client container) does that

### Key internals

- Controllers are **plain namespace objects** (not classes):
  `export const FooController = { async handleRequest(...) {} }`
- Zod schemas are co-located with their controller file
- All DB access goes through Kysely; never raw string concatenation
- Errors use the `Errors` factory (`Errors.notFound()`, `Errors.unauthorized()`, …) and are caught by `ErrorHandler`

---

## Client (`../../client`)

**Runtime:** Browser (Vue 3 SPA)  
**Dev port:** 45173 (Vite)  
**Prod:** Nginx container, routes all non-API traffic through Traefik

### Responsibilities

- File-based routing via `unplugin-vue-router` (pages = files in `src/pages/`)
- State management via Pinia stores (some persisted to `localStorage`)
- Calls API over HTTP via Axios (`src/api.ts` instance)
- Renders timetable grid with conflict detection (client-side)
- i18n: Czech + English via Vue I18n

### What it does NOT do

- Does not talk to Redis or MySQL directly
- Does not run any scheduled work

### Key internals

- Layer order (strict): Pages → Components → Stores → Composables → Utils → Services
- `timetable.store` must **never** import `courses.store` (circular dep prevention)
- Filter reactivity: only `courses.vue` calls `fetchCourses()` via deep-watch; store setters must not call it
- `VITE_*` env vars are baked into the build at compile time by Vite; runtime injection uses placeholder-swap in
  `docker-entrypoint.sh`

---

## Scraper (`../../scraper`)

**Runtime:** Node.js (BullMQ Worker)  
**Concurrency:** 1 (serial per process; InSIS rate limits are the real constraint)

### Responsibilities

- Consumes jobs from `ScraperRequestQueue`
- Makes HTTP requests to InSIS using Axios (`InSISHTTPClientService`)
- Parses HTML with Cheerio (`Extract*Service`)
- Publishes results to `ScraperResponseQueue` for the API to consume

### What it does NOT do

- Does **not** schedule its own jobs — schedulers live in the API
- Does **not** write to the database — all persistence goes through the API via queue

### Error handling

Jobs catch all exceptions internally, log them, and return `null`. BullMQ sees success; failed scrapes stay stale until
the next scheduled run re-enqueues them. No automatic retry.

---

## MCP Server (`../../mcp`)

**Runtime:** Node.js (MCP SDK)
**Transport:** stdio (Claude Desktop) or Streamable HTTP (`POST /mcp`)
**Port:** `MCP_PORT` (default 3000)

### Responsibilities

- Exposes Kreditožrouti data to LLM clients via the Model Context Protocol
- Provides 7 tools: `vse_list_faculties`, `vse_search_courses`, `vse_get_course`, `vse_list_study_plans`,
  `vse_get_study_plan`, `vse_check_timetable_conflicts`, `vse_optimize_timetable`
- Connects directly to MySQL via its own Kysely client (`mcp/src/Db/client.ts`)
- Enforces rate limiting for the optimizer tool in production

### What it does NOT do

- Does **not** call `../../api` HTTP routes — it queries MySQL directly
- Does **not** run scheduled work or enqueue BullMQ jobs

### Key internals

- Imports domain types, DB schema, and query services from `@kreditozrouti/core`
- `createServer()` factory is called fresh per HTTP request (stateless HA)
- `--stdio` flag switches from Streamable HTTP to StdioServerTransport
- Health check available at `GET /health`

---

## Infrastructure Services

These run as Docker containers but are not part of the application codebase.

All third-party images are pinned - never `:latest`. See
[deployment/DOCKER.md](../deployment/DOCKER.md#third-party-image-pinning) for the policy and the full pin table.

| Service       | Image                            | Purpose                                                                     |
|---------------|----------------------------------|-----------------------------------------------------------------------------|
| MySQL         | `mysql:9`                        | Primary data store (courses, study plans)                                   |
| Redis         | `redis:8-alpine`                 | BullMQ queues + session store (AOF-persisted in the deployed stacks)        |
| phpMyAdmin    | `phpmyadmin:5.2.3-apache`        | DB admin UI. Not internet-reachable - see below                             |
| Traefik       | `traefik:v3`                     | Reverse proxy, TLS termination, routing (owned by the Infrastructure repo)  |
| GitHub Runner | `myoung34/github-runner:2.337.0` | Self-hosted CI runner (optional)                                            |

**phpMyAdmin access.** It does not start with the stack (Compose profile `admin`), carries no Traefik labels, and is not
on `public-network`. It is published on loopback only: `127.0.0.1:48080` in production, `127.0.0.1:48081` in
development, `127.0.0.1:48080` locally. Reach the deployed ones over an SSH tunnel
(`ssh -L 48080:127.0.0.1:48080 <user>@<host>`, then http://localhost:48080). It used to be routed publicly at
`${DOMAIN}/phpmyadmin` with `PMA_ARBITRARY=1`: a database admin UI holding the MySQL root credentials on the open
internet, which `PMA_ARBITRARY` further let a visitor aim at any host of their choosing.

### Observability Services (monitoring stack)

| Service    | Image                    | Purpose                                                                                                                                                  |
|------------|--------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Prometheus | `prom/prometheus:v3`     | Metrics collection. Scrapes `/metrics` on API. 15-day retention.                                                                                         |
| Grafana    | `grafana/grafana:13.2`   | Dashboards and alerting. Queries Prometheus and Loki.                                                                                                    |
| Loki       | `grafana/loki:3.7`       | Log aggregation. Receives structured JSON from Alloy. 30-day retention. Internal: `http://loki:3100`.                                                    |
| Alloy      | `grafana/alloy:v1.19.2`  | Log shipping agent. Reads Docker stdout via Docker socket, parses pino JSON, ships to Loki. Also receives Grafana Faro telemetry on port 12347 (Plan 2). |

Alloy publishes no floating `v1` tag, so it is pinned to the exact version.

Full container details: [CONTAINERS.md](CONTAINERS.md)
