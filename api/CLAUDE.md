# API — CLAUDE.md

Comprehensive reference for Claude Code agents working in `api/`.

---

## Directory Structure

```
api/src/
├── index.ts                    # Entry point: cluster management, startWorker()
├── app.ts                      # Express app: middleware, routing, error handling
├── bullmq.ts                   # BullMQ queues, workers, schedulers
├── paths.ts                    # Static path helpers (root, migrations, seeds, etc.)
├── sentry.ts                   # Sentry init + withSentryJobHandler wrapper
├── types.ts                    # Express.Locals augmentation (wideEvent)
│
├── clients/                    # Infrastructure clients (one file per client)
│   ├── mysql.ts                # Kysely instance + slow query logging + Sentry
│   ├── redis.ts                # ioredis instance + createRedisSubscriber() for pub/sub
│   ├── i18n.ts                 # i18n setup
│   ├── mailer.ts               # Nodemailer transporter
│   └── index.ts                # Re-exports: mysql, redis, createRedisSubscriber, i18n, transporter
│
├── Config/
│   └── Config.ts               # Env loading, config object, validation helpers
│
├── Controllers/
│   ├── Kreditozrouti/
│   │   ├── CoursesController.ts          # POST /courses — schema co-located, exports CoursesFilter type
│   │   ├── StudyPlansController.ts       # POST /study_plans — schema co-located, exports StudyPlansFilter type
│   │   ├── StudyPlanCoursesController.ts # POST /study_plans/courses — schema co-located
│   │   └── types/                        # Request/response shape types
│   │       ├── CoursesRequest.ts
│   │       ├── CoursesResponse.ts
│   │       ├── StudyPlansRequest.ts
│   │       ├── StudyPlansResponse.ts
│   │       ├── StudyPlanCoursesRequest.ts
│   │       └── StudyPlanCoursesResponse.ts
│   ├── Scraper/
│   │   └── CourseScraperController.ts    # POST /courses/:id/scrape + GET /courses/:id/scrape/status (SSE)
│   └── Commands/
│       ├── RunInSISCatalogScraperController.ts    # Admin: trigger catalog scrape
│       ├── RunInSISCourseScraperController.ts     # Admin: trigger single course scrape
│       ├── RunInSISStudyPlanScraperController.ts  # Admin: trigger single study plan scrape
│       └── RunInSISStudyPlansScraperController.ts # Admin: trigger study plans catalog scrape
│
├── Services/
│   ├── CourseService.ts        # Course querying: paginated fetch, facets, time-conflict filtering
│   ├── StudyPlanService.ts     # Study plan querying: paginated fetch, facets
│   ├── ScraperService.ts       # All BullMQ enqueue logic (catalog, course, study plans, by ID)
│   ├── EmailService.ts         # Email sending
│   ├── InSISService.ts         # Re-exports getUpcomingPeriod/getPeriodsForLastYears from @shared/domain/period
│   ├── SQLService.ts           # migrateToLatest(), seedInitialData()
│   └── DateService.ts          # getDayFromDate() → InSIS day-of-week enum
│
├── Database/
│   ├── types.ts                # All DB table interfaces + Database interface (single file)
│   ├── migrations/             # Kysely migration files (run automatically on startup)
│   │   ├── 0001_insis_faculties.ts
│   │   ├── 0002_insis_courses.ts
│   │   ├── 0003_insis_study_plans.ts
│   │   ├── 20260122151133_insis_courses_unit_id.ts
│   │   └── 20260127185356_insis_indexes.ts
│   └── seeds/                  # Optional seed scripts (auto-loaded on startup)
│
├── Jobs/
│   ├── ScraperResponseInSISCourseJob.ts      # Syncs scraped course → MySQL (transactional) + Redis publish
│   └── ScraperResponseInSISStudyPlanJob.ts   # Syncs scraped study plan → MySQL
│
├── Handlers/
│   ├── ScraperResponseHandler.ts             # Routes response jobs by name to job classes
│   └── ErrorHandler.ts                       # Global Express error handler (catches ApiError)
│
├── Schedulers/
│   ├── ScraperInSISCatalogRequestScheduler.ts     # Cron: 1 AM Jan/Feb/Aug/Sep
│   └── ScraperInSISStudyPlansRequestScheduler.ts  # Cron: 2 AM Jan/Feb/Aug/Sep
│
├── Routes/
│   ├── KreditozroutiRoutes.ts  # Public data-read routes (withCache(300) on all POST endpoints)
│   ├── ScraperPublicRoutes.ts  # Public scrape-trigger + SSE routes (rate-limited)
│   └── CommandsRoutes.ts       # Protected admin scrape commands (Bearer token)
│
├── Middlewares/
│   ├── CacheMiddleware.ts      # withCache(ttl) factory — SHA-256 key on method+path+body
│   ├── RateLimitMiddleware.ts  # scraperRateLimit() — per-IP (3/10min) + per-course (1/10min)
│   ├── CommandMiddleware.ts    # Bearer token auth for /commands
│   ├── LoggerMiddleware.ts     # Wide-event request logging (Pino, 10% sampling)
│   ├── ParserMiddleware.ts     # body-parser: JSON, raw, urlencoded
│   └── FileMiddleware.ts       # File upload handling
│
├── Errors/
│   └── index.ts                # ApiError class + Errors factory (unauthorized, validation, notFound, internal)
│
├── Validations/
│   └── index.ts                # Shared primitives only: TimeSelectionSchema, SemesterSchema, DaySchema
│
├── Context/
│   ├── LoggerAPIContext.ts     # Request-scoped Pino wide-event logger
│   └── LoggerJobContext.ts     # Job-scoped Pino logger
│
├── contracts/
│   └── index.ts                # Stable barrel: re-exports all client-consumed types (CourseWithRelations, etc.)
│                               # Import API types from here, not from Database/types directly
│
└── utils/
    ├── sse.ts                  # SSE helpers: initSSE, sendSSEEvent, startSSEHeartbeat, closeSSE
    └── timeConflict.ts         # Pure time-conflict functions: buildSlotConflictConditions, compareTimeSelections
```

---

## Startup Sequence (`index.ts`)

1. Cluster master forks N workers (CLI arg, default 1), restarts dead ones
2. Each worker runs `startWorker()`:
    - Connect MySQL (Kysely pool)
    - Run migrations (`SQLService.migrateToLatest()`)
    - Run seeds (`SQLService.seedInitialData()`)
    - Connect Redis (ioredis)
    - Verify email (Nodemailer)
    - Wait for BullMQ queues/workers (`bullmq.waitForQueues()`)
    - Configure schedulers (`bullmq.schedulers()`)
    - Start HTTP server on `Config.port` (default 40080)
    - Graceful shutdown on SIGTERM/SIGINT

---

## Routes & Endpoints

### Public data reads (`/`) — cached 5 min

| Method | Path                   | Controller                 |
| ------ | ---------------------- | -------------------------- |
| `POST` | `/courses`             | CoursesController          |
| `POST` | `/study_plans`         | StudyPlansController       |
| `POST` | `/study_plans/courses` | StudyPlanCoursesController |
| `GET`  | `/health`              | inline 200                 |

### Public scrape trigger (`/`) — rate limited

| Method | Path                         | Controller                                  |
| ------ | ---------------------------- | ------------------------------------------- |
| `POST` | `/courses/:id/scrape`        | CourseScraperController.trigger → 202       |
| `GET`  | `/courses/:id/scrape/status` | CourseScraperController.status → SSE stream |

Rate limits: 3 requests/10min per IP, 1 request/10min per course.

### Protected commands (`/commands` — `Authorization: Bearer <token>`)

| Method | Path                         | Controller                          |
| ------ | ---------------------------- | ----------------------------------- |
| `POST` | `/commands/insis/catalog`    | RunInSISCatalogScraperController    |
| `POST` | `/commands/insis/course`     | RunInSISCourseScraperController     |
| `POST` | `/commands/insis/studyplans` | RunInSISStudyPlansScraperController |
| `POST` | `/commands/insis/studyplan`  | RunInSISStudyPlanScraperController  |

---

## SSE Flow (course scrape notification)

```
Client POST /courses/:id/scrape
  → RateLimitMiddleware
  → CourseScraperController.trigger
  → ScraperService.enqueueCourseScrapeById(id)  ← looks up URL, enqueues BullMQ job
  → 202 { jobId }

Client GET /courses/:id/scrape/status
  → CourseScraperController.status
  → initSSE(res) + startSSEHeartbeat(res, 30s)
  → redis.duplicate().subscribe('course:updated:{id}')
  → sendSSEEvent(res, 'progress', { status: 'waiting' })
  → [scraper runs, ScraperResponseInSISCourseJob syncs DB]
  → redis.publish('course:updated:{id}', { status: 'done', courseId, updatedAt })
  → sendSSEEvent(res, 'complete', payload) + closeSSE(res)
```

Timeout: 5 minutes. Client disconnect: cleans up subscriber + heartbeat.

---

## Error Handling

```typescript
import { Errors, ApiError } from '@api/Errors'

// Throw anywhere — caught by ErrorHandler middleware
throw Errors.unauthorized()
throw Errors.validation(zodResult.error.issues)
throw Errors.notFound('Course not found')
throw Errors.internal('Something went wrong')

// ErrorHandler returns:
{ type: 'UNAUTHORIZED' | 'VALIDATION' | 'NOT_FOUND' | 'INTERNAL', message: string, details: {} }
```

---

## Database Schema

### Tables

**`insis_faculties`** — `id` (string PK e.g. "FIS"), `title`

**`insis_courses`** — `id` (auto PK), `faculty_id` FK, `url`, `ident`, `title/title_cs/title_en`, `ects`, `mode_of_delivery`, `mode_of_completion`, `languages` (pipe-delimited), `level`, `year_of_study`, `semester` (ZS/LS), `year`, `lecturers` (pipe-delimited), and long-text fields.

**`insis_courses_assessments`** — `course_id` FK CASCADE DELETE, `method`, `weight`

**`insis_courses_units`** — `course_id` FK CASCADE DELETE, `type`, `lecturer`, `capacity`, `note`

**`insis_courses_units_slots`** — `unit_id` FK CASCADE DELETE, `type` (regular/irregular/one_time), `frequency`, `date` (nullable), `day` (enum nullable), `time_from`/`time_to` (**minutes from midnight**), `location`

**`insis_study_plans`** — `faculty_id` FK, `ident`, `title`, `semester`, `year`, `level`, `mode_of_study`, `study_length`

**`insis_study_plans_courses`** — `study_plan_id` FK CASCADE DELETE, `course_id` FK nullable, `course_ident` (cached), `group`, `category`

### Time encoding

All times = **minutes from midnight** (0–1439). `08:00` → `480`, `17:45` → `1065`.

### Pipe-delimited fields

`languages` and `lecturers` on `insis_courses` are pipe-delimited strings. Parsed in service layer.

---

## Key Service Patterns

### N+1 Avoidance (CourseService, StudyPlanService)

```
1. COUNT query with filters → total
2. Paginated ID query → [id, id, ...]
3. Parallel relation queries (units+slots, assessments, study_plans, faculty)
4. In-memory merge by ID
```

### Redis Caching (CacheMiddleware)

- Applied at route level via `withCache(300)` on all data-read POST routes
- Cache key: SHA-256 of `METHOD:path:sorted-body-JSON`, prefixed `cache:`
- TTL: 300 seconds. Redis errors silently bypassed (never breaks the route)

### ScraperService — all BullMQ enqueue logic

```typescript
ScraperService.enqueueCatalogScrape(options?)
ScraperService.enqueueCourseScrape(url)       // returns jobId
ScraperService.enqueueStudyPlansScrape(options?)
ScraperService.enqueueStudyPlanScrape(url)
ScraperService.enqueueCourseScrapeById(id)    // looks up URL, returns jobId
```

### Job Sync (ScraperResponseInSISCourseJob)

Runs in DB transaction:

1. Upsert faculty
2. Upsert course (INSERT ... ON DUPLICATE KEY UPDATE)
3. Reconcile assessments
4. Delete + recreate units + slots
5. Link course to study plans via `course_ident`
6. `redis.publish('course:updated:{id}', ...)` after commit

---

## Validation

Zod schemas are **co-located with their controller** (not in separate Validations files).

`Validations/index.ts` exports shared primitives only: `TimeSelectionSchema`, `SemesterSchema`, `DaySchema`.

Filter types are exported from controllers:

```typescript
import type { CoursesFilter } from '@api/Controllers/Kreditozrouti/CoursesController'
import type { StudyPlansFilter } from '@api/Controllers/Kreditozrouti/StudyPlansController'
```

---

## BullMQ

- **ScraperRequestQueue**: API → Scraper (outbound jobs)
- **ScraperResponseQueue**: Scraper → API (inbound results), concurrency 4

**Deduplication windows** (prevent duplicate jobs during high-frequency triggers):

| Job type | Dedup TTL |
| -------- | --------- |
| Catalog scrape | 30 seconds |
| Study plans catalog | 30 seconds |
| Single course scrape | 1 second |
| Single study plan scrape | 1 second |

**Retry policy:** Failed jobs are not retried automatically — errors are logged and the job completes. Re-triggering is done via scheduled runs or manual command endpoints.

**Schedulers (production only — `NODE_ENV=production`):**

- Catalog: `0 1 * 1-2,8-9 *` — Jan/Feb/Aug/Sep 1 AM
- Study Plans: `0 2 * 1-2,8-9 *` — Jan/Feb/Aug/Sep 2 AM

In development: trigger via `POST /commands/insis/*` with Bearer token.

---

## Path Aliases

Defined in `api/tsconfig.json` and resolved by `tsc-alias` at build time:

| Alias | Resolves to | Notes |
| ----- | ----------- | ----- |
| `@api/*` | `./src/*` | API source root |
| `@shared/*` | `../shared/*` | Cross-package pure utilities (no runtime deps on api or client) |

**`api/src/contracts/index.ts`** — stable barrel that re-exports all types the client consumes. Client imports should use `@api/contracts`, not `@api/Database/types` directly.

**`@shared/domain/period`** exports `getUpcomingPeriod` and `getPeriodsForLastYears`. `InSISService.ts` re-exports these under the same class shape for backward compatibility with existing callers.

---

## Configuration

Key env vars:

```
MYSQL_URI, REDIS_URI
API_PORT (default 40080)
API_SESSION_SECRET, API_COMMAND_TOKEN
API_DOMAIN (default localhost), API_ALLOWED_ORIGINS
CLIENT_URI
NODE_ENV (local | development | production)
SENTRY_DSN, GOOGLE_USER, GOOGLE_APP_PASSWORD
```

---

## Controller Naming Convention

Controllers use **named functions exported as a namespace object**, not class instances:

```typescript
// ✅ Correct — function exported as static method on namespace object
export const CoursesController = {
  async handleRequest(req: Request, res: Response) { ... }
}

// ❌ Wrong — do not use class instantiation or default export functions
export default class CoursesController { ... }
```

This allows tree-shaking and avoids `this` binding issues in Express route handlers.

---

## Middleware Execution Order (`app.ts`)

Middleware applied in this order per request:

1. **Helmet** — security headers
2. **CORS** — origin allowlist from `Config.allowedOrigins`
3. **ParserMiddleware** — body-parser (JSON, raw, urlencoded)
4. **LoggerMiddleware** — wide-event Pino logging (10% sampling in production)
5. **Session** — Redis-backed express-session
6. *(Route-specific)* **CacheMiddleware** — Redis response cache for data-read routes
7. *(Route-specific)* **RateLimitMiddleware** — per-IP/per-resource limits for scraper routes
8. *(Route-specific)* **CommandMiddleware** — Bearer token auth for `/commands`
9. **Route handlers**
10. **ErrorHandler** — global Express error handler (`ApiError` → structured JSON response)

---

## Adding a New Endpoint

1. **Schema**: define Zod schema inline in the controller file
2. **Service**: add query logic to existing or new `Services/*.ts`
3. **Controller**: create `Controllers/<Group>/NewController.ts` — thin: validate → service → return; use named function namespace (see convention above)
4. **Route**: register in appropriate `Routes/*.ts`
5. **Cache**: wrap with `withCache(ttl)` in the route if it's a data-read endpoint

## Adding a Migration

1. Create `Database/migrations/YYYYMMDDHHMMSS_description.ts`
2. Export `up(db)` and `down(db)`
3. Update `Database/types.ts` with new interfaces if needed
4. Restart API to apply

---

## Testing

Bruno collection: `api/bruno/Kreditozrouti/`

No automated unit/integration tests yet.
