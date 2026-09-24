# API - AGENTS.md

> Full reference: [docs/api/](../docs/api/README.md)

---

## Directory Structure

```
api/src/
├── index.ts / app.ts / bullmq.ts
├── metrics.ts      # prom-client: request histogram, bullmq_job_count, worker metrics, proxy-guarded /metrics
├── clients/        # mysql, redis, i18n, mailer
├── Config/         # Config.ts - env vars
├── Controllers/    # Courses, StudyPlans, Scraper, Commands, Optimize, Share, ICal, Admin
├── Services/       # Course, study-plan, scraper, optimization, and calendar logic
├── Database/       # types.ts + migrations/
├── Jobs/           # Scraper response jobs and gap sweep
├── Handlers/       # ScraperResponseHandler, ErrorHandler
├── Routes/         # Courses, StudyPlans, Share, Optimize, ICal, Commands, Admin
├── Middlewares/    # CacheMiddleware, RateLimitMiddleware, CommandMiddleware, LoggerMiddleware
├── Errors/         # ApiError + Errors factory
└── Utils/          # Sse.ts, TimeConflict.ts
```

## Path Aliases

| Alias                    | Resolves to                 |
| ------------------------ | --------------------------- |
| `@api/*`                 | `./src/*`                   |
| `@scraper/*`             | `../scraper/src/*`          |
| `@kreditozrouti/core/*` | `../packages/core/src/*`    |

Shared DTO and queue types come from `@kreditozrouti/types`.

---

## Critical Invariants

**Controllers** use named function namespace objects, not classes:

```typescript
export const CoursesController = {
	async handleRequest(req: Request, res: Response) { ...
	}
}
```

**Zod schemas** are co-located with their controller or route. Check the owning handler before changing validation.

**Times** are stored as **minutes from midnight** (0–1439). `08:00` → `480`.

**Pipe-delimited fields:** `languages` and `lecturers` on `insis_courses` are pipe-delimited strings, parsed in the
service layer.

**Cache invalidation:** `CacheMiddleware` uses SHA-256 of `METHOD:path:sorted-body-JSON`, prefix `cache:`, TTL 300 s.

**Schedulers** are registered in `src/bullmq.ts` only in production. In development, use `POST /commands/insis/*` with a Bearer token.

**ScraperResponseInSISCourseJob** runs in a DB transaction: upsert faculty → upsert course → reconcile assessments →
delete+recreate units+slots → link study plans → `redis.publish('course:updated:{id}')`.

**Error handling:** throw `Errors.unauthorized()` / `Errors.validation(issues)` / `Errors.notFound(msg)` /
`Errors.internal(msg)` anywhere - `ErrorHandler` catches all `ApiError` instances.

**Metrics are a contract with deployment/monitoring.** `http_server_request_duration_seconds`, `bullmq_job_count`,
`worker_*` and `app_build_info` are queried by promtool-tested rules and dashboards, and the Ohlidame stack uses the same
names. Everything is in-process (nothing mirrored through Redis); `bullmq_job_count` is reported by the api only, so
scraper replicas never double it. Labels stay bounded: never a course, plan or share id.

---

## Key Docs

| Topic                                                      | Doc                                      |
| ---------------------------------------------------------- | ---------------------------------------- |
| Route overview; exact shapes in shared types and handlers  | [ENDPOINTS.md](../docs/api/ENDPOINTS.md) |
| CourseService N+1 pattern, facets, time-conflict filtering | [SERVICES.md](../docs/api/SERVICES.md)   |
| BullMQ jobs, schedulers, dedup windows                     | [JOBS.md](../docs/api/JOBS.md)           |
| DB schema and migration workflow                           | [DATABASE.md](../docs/api/DATABASE.md)   |
| Config, cache, rate-limit, SSE, wide-event logging         | [INTERNALS.md](../docs/api/INTERNALS.md) |
| Gmail SMTP account and credentials                         | [GMAIL.md](../docs/setup/GMAIL.md)       |
