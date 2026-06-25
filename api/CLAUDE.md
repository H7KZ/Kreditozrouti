# API — CLAUDE.md

> Full reference: [docs/api/](../docs/api/README.md)

---

## Directory Structure

```
api/src/
├── index.ts / app.ts / bullmq.ts
├── clients/        # mysql, redis, i18n, mailer
├── Config/         # Config.ts — env vars
├── Controllers/    # thin: validate (Zod) → service → respond
│   ├── Kreditozrouti/   # CoursesController, StudyPlansController, StudyPlanCoursesController
│   ├── Scraper/         # CourseScraperController (trigger + SSE)
│   └── Commands/        # Admin scrape triggers (Bearer token)
├── Services/       # CourseService, StudyPlanService, ScraperService, SQLService, ...
├── Database/       # types.ts + migrations/
├── Jobs/           # ScraperResponseInSISCourseJob, ScraperResponseInSISStudyPlanJob
├── Handlers/       # ScraperResponseHandler, ErrorHandler
├── Schedulers/     # Cron jobs (production only)
├── Routes/         # KreditozroutiRoutes, ScraperPublicRoutes, CommandsRoutes
├── Middlewares/    # CacheMiddleware, RateLimitMiddleware, CommandMiddleware, LoggerMiddleware
├── Errors/         # ApiError + Errors factory
└── Utils/          # sse.ts, timeConflict.ts
```

## Path Aliases

| Alias       | Resolves to   |
| ----------- | ------------- |
| `@api/*`    | `./src/*`     |
| `@shared/*` | `../shared/*` |

---

## Critical Invariants

**Controllers** use named function namespace objects, not classes:

```typescript
export const CoursesController = {
	async handleRequest(req: Request, res: Response) { ...
	}
}
```

**Zod schemas** are co-located with their controller, not in `Validations/`. `Validations/index.ts` only exports shared
primitives (`TimeSelectionSchema`, `SemesterSchema`, `DaySchema`).

**Times** are stored as **minutes from midnight** (0–1439). `08:00` → `480`.

**Pipe-delimited fields:** `languages` and `lecturers` on `insis_courses` are pipe-delimited strings, parsed in the
service layer.

**Cache invalidation:** `CacheMiddleware` uses SHA-256 of `METHOD:path:sorted-body-JSON`, prefix `cache:`, TTL 300 s.

**Schedulers** only run in `NODE_ENV=production`. In development, use `POST /commands/insis/*` with Bearer token.

**ScraperResponseInSISCourseJob** runs in a DB transaction: upsert faculty → upsert course → reconcile assessments →
delete+recreate units+slots → link study plans → `redis.publish('course:updated:{id}')`.

**Error handling:** throw `Errors.unauthorized()` / `Errors.validation(issues)` / `Errors.notFound(msg)` /
`Errors.internal(msg)` anywhere — `ErrorHandler` catches all `ApiError` instances.

---

## Key Docs

| Topic                                                      | Doc                                      |
| ---------------------------------------------------------- | ---------------------------------------- |
| All routes + request/response shapes                       | [ENDPOINTS.md](../docs/api/ENDPOINTS.md) |
| CourseService N+1 pattern, facets, time-conflict filtering | [SERVICES.md](../docs/api/SERVICES.md)   |
| BullMQ jobs, schedulers, dedup windows                     | [JOBS.md](../docs/api/JOBS.md)           |
| DB schema, Kysely patterns, migration template             | [DATABASE.md](../docs/api/DATABASE.md)   |
| Config, cache, rate-limit, SSE, wide-event logging         | [INTERNALS.md](../docs/api/INTERNALS.md) |
