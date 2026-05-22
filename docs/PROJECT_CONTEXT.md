# Kreditozrouti — Project Context

*Course scheduling system for VŠE students. Scrapes InSIS, presents filterable timetable UI.*

## Monorepo Architecture

```text
api/          Express API — HTTP, DB writes, job orchestration
client/       Vue 3 SPA — user interface
scraper/      BullMQ worker — InSIS HTTP scraping
shared/       Types only — imported by all packages, imports nothing
scripts/      Bash — server setup & maintenance
deployment/   Docker Compose stacks + deploy.sh
```

## Critical Global Invariants

- **Cross-package imports:**
  - `shared/` must never import from `api/`, `client/`, or `scraper/`
  - `client/` never imports from `api/` — all shared types come from `@shared/`
  - `client/` never imports API runtime code
- **Time encoding:** all times are **minutes from midnight** (0–1439). e.g., `08:00` = 480.
- **Env var prefixes:**
  - API: `API_*` | Client: `VITE_*` (baked at build) | Scraper: no prefix | Infra: `MYSQL_*`, `REDIS_*`
- **Doc-Review Rule**: After modifying code/config, you MUST update relevant docs in the `docs/` folder.

---

## 1. API Invariants
- **Controllers** use named function namespace objects, not classes (e.g., `export const CoursesController = { ... }`).
- **Zod schemas** are co-located with their controller, not in `Validations/`. Shared primitives go in `Validations/index.ts`.
- **Pipe-delimited fields:** `languages` and `lecturers` on `insis_courses` are pipe-delimited strings, parsed in the service layer.
- **Cache invalidation:** `CacheMiddleware` uses SHA-256 of `METHOD:path:sorted-body-JSON`, prefix `cache:`, TTL 300s.
- **Schedulers** only run in `NODE_ENV=production`. In development, trigger via `POST /commands/insis/*` with Bearer token.
- **ScraperResponseInSISCourseJob** runs in a DB transaction: upsert faculty → upsert course → reconcile assessments → delete+recreate units+slots → link study plans → `redis.publish('course:updated:{id}')`.
- **Error handling:** throw `Errors.*` anywhere — `ErrorHandler` catches all `ApiError` instances.

## 2. Client (Vue 3) Invariants
- **Store dependency rule:** `timetable.store` must NOT import `courses.store` (circular dependency forbidden).
- **Filter reactivity:** `courses.vue` deep-watches `filtersStore.filters` and calls `fetchCourses()` automatically. Filter setters must NOT call `fetchCourses()` themselves (exception: `toggleHideConflictingCourses()`).
- **Campus detection:** `getCampus(location)` splits on `/[.\-\s]/`, uppercases first token. `JM*` → `jizni-mesto`; `RB|NB|IB|SB` → `zizkov`. No conflict raised if either campus is `'unknown'`.
- **`useSharedCourseStatusFilter()`** is a module-level singleton. Always use it so components share state.
- **i18n in stores:** use `i18n.global` (not `useI18n()`).
- **localStorage keys:** `kreditozrouti:timetable`, `kreditozrouti:wizard`, `kreditozrouti:ui`.

## 3. Scraper Invariants
- **Job Routing:** `InSIS:Course` -> `ScraperRequestInSISCourseJob`, etc.
- **Error pattern — jobs never throw:** Scrape errors are logged and return `null` so BullMQ sees success (no automatic retry). Failed scrapes stay stale until the next scheduled run.
- **Worker concurrency: 1** (serial per worker process). Constraints are InSIS rate limits.
- **Scraper is a pure consumer:** It never schedules its own jobs (API handles scheduling).

## 4. Deployment & Scripts
- **Deploy order on fresh server:** Traefik → GlitchTip (opt) → GitHub Runner (opt) → app stack.
- **`deployment/.env` is gitignored.** Secrets never go in compose files. Lives in `~/variables/.env.prod` on VPS.
- **`VITE_*` env vars** are baked into the client image at build time by Vite.
- **Redis data is ephemeral**. No named volume for Redis. Only MySQL data is persisted.
- **`deploy.sh`** must be called by path (`./deployment/deploy.sh`) or from within `deployment/`.
- **Scripts:** Always source `lib.sh` first in any new script. `docker-cleanup.sh` — always run `--dry-run` before `--force`.
