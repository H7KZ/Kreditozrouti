# Services

## API (`api/`)

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

## Client (`client/`)

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

## Scraper (`scraper/`)

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

## Infrastructure Services

These run as Docker containers but are not part of the application codebase.

| Service       | Image                    | Purpose                                   |
|---------------|--------------------------|-------------------------------------------|
| MySQL 8       | `mysql:8`                | Primary data store (courses, study plans) |
| Redis         | `redis:alpine`           | BullMQ queues + session store (ephemeral) |
| phpMyAdmin    | `phpmyadmin`             | DB admin UI (dev/prod, port 48080 dev)    |
| Traefik       | `traefik:v3`             | Reverse proxy, TLS termination, routing   |
| GlitchTip     | `glitchtip/*`            | Error tracking (optional, production)     |
| GitHub Runner | `myoung34/github-runner` | Self-hosted CI runner (optional)          |

Full container details: [CONTAINERS.md](CONTAINERS.md)
