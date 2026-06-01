# API — Endpoints Reference

## Middleware Execution Order

Every request passes through this stack (defined in `app.ts`):

1. **Helmet** — security headers
2. **CORS** — origin allowlist from `Config.allowedOrigins`
3. **ParserMiddleware** — body-parser (JSON, raw, urlencoded)
4. **LoggerMiddleware** — wide-event Pino logging (10% sampling in production)
5. **Session** — Redis-backed express-session
6. _(route-specific)_ **CacheMiddleware** — Redis response cache
7. _(route-specific)_ **RateLimitMiddleware** — per-IP + per-course limits
8. _(route-specific)_ **CommandMiddleware** — Bearer token auth
9. **Route handlers**
10. **ErrorHandler** — `ApiError` → structured JSON response

---

## Public Data Routes (`KreditozroutiRoutes`)

All POST routes are wrapped with `withCache(300)` (5-minute Redis cache).

### `POST /courses`

Returns a paginated list of courses with facets for all filter dimensions.

**Controller:** `CoursesController.handleRequest`

**Request body (Zod-validated):**

```typescript
{
    page ? : number           // default 1
    page_size ? : number      // default 20, max 100

    // Text search
    title ? : string

    // Categorical filters
    faculty_ids ? : string[]
    levels ? : string[]
    semesters ? : InSISSemester[]        // 'ZS' | 'LS'
    years ? : number[]
    modes_of_delivery ? : string[]
    modes_of_completion ? : string[]
    languages ? : string[]
    years_of_study ? : number[]
    lecturers ? : string[]
    ects ? : number[]

    // Study plan filters
    study_plan_idents ? : string[]
    study_plan_groups ? : InSISStudyPlanCourseGroup[]
    study_plan_categories ? : InSISStudyPlanCourseCategory[]

    // Time-conflict exclusions — slots overlapping any of these are excluded
    exclude_times ? : TimeSelection[]

    // Specific study plan linkage
    study_plan_id ? : number
}
```

**`TimeSelection` shape:**

```typescript
{
    day ? : InSISDay          // Czech day name
    date ? : string           // ISO date for one-time exclusions
    time_from: number       // minutes from midnight
    time_to: number         // minutes from midnight
    slot_id ? : number        // exclude a specific slot from conflict detection
}
```

**Response:**

```typescript
{
    data: CourseWithRelations[]
    facets: {
        faculty_ids: {
            value: string;
            count: number
        }
        []
        levels: {
            value: string;
            count: number
        }
        []
        semesters: {
            value: string;
            count: number
        }
        []
        years: {
            value: string;
            count: number
        }
        []
        modes_of_delivery: {
            value: string;
            count: number
        }
        []
        modes_of_completion: {
            value: string;
            count: number
        }
        []
        languages: {
            value: string;
            count: number
        }
        []
        years_of_study: {
            value: string;
            count: number
        }
        []
        lecturers: {
            value: string;
            count: number
        }
        []
        ects: {
            value: string;
            count: number
        }
        []
    }
    meta: {
        page: number
        page_size: number
        total: number
        total_pages: number
    }
}
```

---

### `POST /study_plans`

Returns a paginated list of study plans with facets.

**Controller:** `StudyPlansController.handleRequest`

**Request body:**

```typescript
{
    page ? : number
    page_size ? : number

    faculty_ids ? : string[]
    levels ? : string[]
    semesters ? : InSISSemester[]
    years ? : number[]
    modes_of_study ? : string[]
}
```

**Response:** `{ data: StudyPlanWithRelations[], facets: {...}, meta: {...} }`

---

### `POST /study_plans/courses`

Returns courses belonging to a specific study plan.

**Controller:** `StudyPlanCoursesController.handleRequest`

**Request body:**

```typescript
{
    study_plan_id: number     // required
    page ? : number
    page_size ? : number
    // ... same course filters as POST /courses
}
```

---

### `GET /health`

Returns `200 OK` immediately — no logic, used by load balancers.

---

### `GET /metrics`

Returns Prometheus-format metrics for the API process.

**Internal only** — not routed through Traefik. Prometheus scrapes this directly from the container on its internal
Docker network port.

Metrics exposed:

| Metric                          | Type      | Description                                   |
|---------------------------------|-----------|-----------------------------------------------|
| `http_requests_total`           | Counter   | Total HTTP requests, labelled by method/route/status |
| `http_request_duration_seconds` | Histogram | Request latency in seconds                    |
| Default Node.js metrics         | Various   | Event loop lag, GC, memory, etc. (from `prom-client`) |

**Implementation:** `api/src/metrics.ts` — uses `prom-client`. `metricsMiddleware` is applied globally; `metricsHandler`
is the `GET /metrics` route handler.

---

### Bull Board (`/bullboard`)

BullMQ queue inspection UI. Routes to the Bull Board Express adapter mounted at `/bullboard`.

**Internal only** — not routed through Traefik in production. Access via SSH tunnel or internal network.

Path was previously `/admin/queues`; moved to `/bullboard` to align with the Traefik label and avoid
collision with the `/admin` prefix.

---

## Scrape Trigger Routes (`ScraperPublicRoutes`)

Rate limited: 3 requests/10 minutes per IP, 1 request/10 minutes per course.

### `POST /courses/:id/scrape`

Enqueues a BullMQ job to re-scrape a single course.

**Controller:** `CourseScraperController.trigger`

**Flow:**

1. Parse and validate `:id` (must be a positive integer)
2. Call `ScraperService.enqueueCourseScrapeById(id)` — looks up the course URL, enqueues `InSIS:Course` job
3. Return `202 { jobId: string }`

**Errors:** `404` if course not found, `429` if rate limited.

---

### `GET /courses/:id/scrape/status`

Opens an SSE stream that emits events as the scrape progresses.

**Controller:** `CourseScraperController.status`

**SSE events:**

| Event      | Payload                                   | When                      |
|------------|-------------------------------------------|---------------------------|
| `progress` | `{ status: 'waiting' }`                   | Immediately on connection |
| `complete` | `{ status: 'done', courseId, updatedAt }` | After DB sync completes   |
| `error`    | `{ status: 'error', message }`            | On scrape failure         |

**Timeout:** 5 minutes. On timeout the stream closes gracefully.

**Client disconnect:** subscriber + heartbeat interval are cleaned up immediately.

**Implementation details:**

- `initSSE(res)` sets headers and flushes
- `startSSEHeartbeat(res, 30_000)` sends `: heartbeat\n\n` every 30 seconds (keeps connection alive through proxies)
- `createRedisSubscriber()` creates a dedicated ioredis subscriber connection for `course:updated:{id}` channel
- When `ScraperResponseInSISCourseJob` finishes, it publishes to that channel, which triggers the `complete` event

---

## Admin Command Routes (`CommandsRoutes`)

All routes require `Authorization: Bearer <API_COMMAND_TOKEN>` header.

### `POST /commands/insis/catalog`

Triggers a full InSIS course catalog scrape.

**Controller:** `RunInSISCatalogScraperController`

**Optional body:**

```typescript
{
    faculties ? : string[]       // filter to specific faculty idents
    periods ? : {semester: InSISSemester | null; year: number}[]
    auto_queue_courses ? : boolean   // default true
}
```

---

### `POST /commands/insis/course`

Triggers scraping of a single course by URL.

**Controller:** `RunInSISCourseScraperController`

**Body:**

```typescript
{
    url: string
}
```

---

### `POST /commands/insis/studyplans`

Triggers a full study plans catalog scrape.

**Controller:** `RunInSISStudyPlansScraperController`

**Optional body:**

```typescript
{
    faculties ? : string[]
    periods ? : {semester: InSISSemester | null; year: number}[]
    auto_queue_study_plans ? : boolean
}
```

---

### `POST /commands/insis/studyplan`

Triggers scraping of a single study plan by URL.

**Controller:** `RunInSISStudyPlanScraperController`

**Body:**

```typescript
{
    url: string
}
```

---

## Controller Convention

Controllers use **named function namespace objects**, not class instances:

```typescript
// ✅ Correct
export const CoursesController = {
    async handleRequest(req: Request, res: Response) { ...
    }
}

// ❌ Wrong
export default class CoursesController {
...
}
```

This avoids `this` binding issues and is consistent across the entire codebase.

---

## Error Response Shape

All errors thrown via `Errors.*` produce this shape:

```typescript
{
    type: 'UNAUTHORIZED' | 'VALIDATION' | 'NOT_FOUND' | 'INTERNAL'
    message: string
    details: Record<string, unknown>   // e.g. { issues: ZodIssue[] } for VALIDATION
}
```

HTTP status codes: `401`, `403`, `404`, `500` respectively.
