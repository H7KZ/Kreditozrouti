# Scraper — Queue & BullMQ

The scraper communicates with the API entirely through two BullMQ queues backed by Redis. This document covers the queue
topology, job lifecycle, deduplication, retry policy, and how the API scheduler triggers the scraper.

## Queue Topology

```
┌────────────────────────────────────────────────────────────┐
│  API Process                                               │
│  ┌──────────────────────┐   ┌─────────────────────────┐    │
│  │ ScraperRequestQueue  │   │ ScraperResponseQueue    │    │
│  │   (producer)         │   │   (consumer — Worker)   │    │
│  │                      │   │   concurrency: 2        │    │
│  │ + upsertJobScheduler │   │                         │    │
│  │   (cron at 3 AM)     │   │                         │    │
│  └──────────────────────┘   └─────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
           │ Redis                              ↑
           ↓                                   │
┌────────────────────────────────────────────────────────────┐
│  Scraper Process                                           │
│  ┌──────────────────────┐   ┌─────────────────────────┐    │
│  │ ScraperRequestQueue  │   │ ScraperResponseQueue    │    │
│  │   (consumer — Worker)│   │   (producer)            │    │
│  │   concurrency: 1     │   │                         │    │
│  │   (x2 replicas)      │   │                         │    │
│  └──────────────────────┘   └─────────────────────────┘    │
│            │                                               │
│            ↓  every InSIS request passes through           │
│  ┌──────────────────────────────────────────────────┐      │
│  │ InSISRateLimitService (Redis token bucket)       │      │
│  │   global ceiling, holds across replicas          │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────┘
```

Both sides reference the same two Redis queue names (defined in `@shared/queue/names`). The direction is determined by
which side creates a `Queue` (producer) vs a `Worker` (consumer).

## Queue Names

| Constant               | Queue name         | Direction     |
|------------------------|--------------------|---------------|
| `ScraperRequestQueue`  | `scraper:request`  | API → Scraper |
| `ScraperResponseQueue` | `scraper:response` | Scraper → API |

## Scraper-side Configuration (`../../scraper/src/bullmq.ts`)

### Request Worker

```typescript
new Worker(ScraperRequestQueue, handler, {
	concurrency: 1,
	lockDuration: 900_000,
	maxStalledCount: 3
})
```

- **Concurrency 1:** up to 1 job runs at a time per worker process. Production runs `replicas: 2`, so two jobs can be
  in flight across the deployment.
- **No BullMQ limiter.** There is deliberately none. A queue limiter caps *job starts*, but a single catalog or study
  plan job fans out internally via `runWithConcurrency`, so one job start can mean four or six simultaneous requests
  at InSIS. Capping job starts therefore does not cap the thing that reaches the university.

> **Correction:** earlier revisions of this document described a `limiter: { max: 10, duration: 1000 }` on this worker
> and called it "the primary InSIS rate-limit guard". No such limiter has ever existed in `bullmq.ts`, and as
> explained above it would not have bounded outbound requests even if it had. The real ceiling now lives in
> `InSISRateLimitService` - see below.

### InSIS rate limiting

The ceiling on outbound requests to InSIS is enforced in `Services/InSISRateLimitService.ts`, not in the queue. It is
a Redis-backed token bucket consulted by an axios request interceptor in `InSISHTTPClientService`, which is the single
choke point every InSIS call passes through, retries included.

Because the bucket lives in Redis it holds across both replicas, across worker concurrency, and across every job type,
and it cannot be defeated by scaling the service or by a future job adding another fan-out layer.

| Env var                        | Prod default | Dev default | Meaning                                         |
|--------------------------------|--------------|-------------|-------------------------------------------------|
| `INSIS_RATE_LIMIT_RPS`         | 4            | 2           | Sustained requests per second, whole deployment |
| `INSIS_RATE_LIMIT_BURST`       | 8            | 4           | Token bucket capacity, i.e. burst size          |
| `INSIS_RATE_LIMIT_MAX_WAIT_MS` | 30000        | 30000       | How long one request waits before giving up     |

It **fails closed**: if Redis cannot be consulted, requests are refused rather than sent unpaced. That costs little in
practice, since BullMQ uses the same Redis and a Redis outage already means no jobs are running.

Do not add a `SCRAPER_CONCURRENCY` env var for parity with sibling projects. This service's parallelism is
multiplicative and such a knob would sit on top of the product of every fan-out layer. See
[ADR 0002](../adr/0002-global-insis-rate-limit-not-a-concurrency-knob.md).

### Default Job Options

```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { age: 86_400 }
}
```

All jobs on `ScraperRequestQueue` get 3 attempts with exponential backoff starting at 10 seconds (10s → 20s → 40s). This
applies only to jobs that throw a retryable error — jobs that throw `UnrecoverableError` (such as `InSISParseError`)
skip the retry queue immediately.

### Response Queue

The response queue is a `Queue` (producer only from the scraper's perspective). The scraper writes results into it; the
API consumes them. It has its own `defaultJobOptions`:

```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { age: 86_400 }
}
```

## API-side Configuration (`../../api/src/bullmq.ts`)

### Response Worker

```typescript
new Worker(ScraperResponseQueue, handler, {
	concurrency: 2,
	maxStalledCount: 2 // allow 2 stall recoveries before permanent failure
})
```

Processes incoming results from the scraper. Each job is handled by `ScraperResponseHandler`, which routes by
`job.data.type` to the appropriate response job class (`ScraperResponseInSISCourseJob` or
`ScraperResponseInSISStudyPlanJob`).

### Scheduler

The API registers two BullMQ job schedulers on startup (production only). Registration window decisions live entirely in
the API — the cron pattern itself is scoped to the months when InSIS data changes:

```typescript
// Registration window months (ZS: Jun–Sep, LS: Jan–Feb, with 1-week early-start buffer)
const REGISTRATION_MONTHS_CRON = '1,2,6,7,8,9'

// Catalog: 3 AM during registration months
await scraperRequestQueue.upsertJobScheduler(
	ScraperInSISCatalogRequestScheduler,
	{pattern: `0 3 * ${REGISTRATION_MONTHS_CRON} *`},
	{name: 'InSIS:Catalog', data: {type: 'InSIS:Catalog', auto_queue_courses: true, periods: [...]}}
)

// Study Plans: 2 AM during registration months
await scraperRequestQueue.upsertJobScheduler(
	ScraperInSISStudyPlansRequestScheduler,
	{pattern: `0 2 * ${REGISTRATION_MONTHS_CRON} *`},
	{name: 'InSIS:StudyPlans', data: {type: 'InSIS:StudyPlans', auto_queue_study_plans: true, periods: [...]}}
)
```

Each scheduler entry is stored in Redis. At the scheduled time, BullMQ enqueues the job directly onto
`ScraperRequestQueue` — the scraper receives an `InSIS:Catalog` or `InSIS:StudyPlans` job and executes it without any
gate logic.

On startup the API also cleans up the old `SupervisorScheduler` entry left over from the previous architecture.

**In development:** The scheduler is disabled. Trigger scrapes manually via the `/commands/insis/*` API endpoints.

## Deduplication

BullMQ's built-in deduplication prevents the same logical job from being queued multiple times within a TTL window. The
scraper uses it to avoid re-scraping courses that are already queued.

| Job                                  | Dedup key                                   | TTL        |
|--------------------------------------|---------------------------------------------|------------|
| `InSIS:Catalog` (manual run)         | `InSIS:Catalog:ManualRun`                   | 30 seconds |
| `InSIS:StudyPlans` (manual run)      | `InSIS:StudyPlans:ManualRun`                | 30 seconds |
| `InSIS:Course` (from catalog)        | `InSIS:Course:{courseId}`                   | 5 minutes  |
| `InSIS:StudyPlan` (from study plans) | `InSIS:StudyPlan:{planId}`                  | 1 hour     |
| `InSIS:AcademicSchedule`             | `InSIS:AcademicSchedule:{faculty}:{period}` | 1 hour     |
| `InSIS:FacultyTimetable`             | `InSIS:FacultyTimetable:{f_id}`             | 1 hour     |

All dedup keys now have explicit TTLs. Course and study plan keys use longer windows (5 min / 1 hour) to prevent
re-queueing while the scraper works through its backlog.

## Job Lifecycle

```
API enqueues job
  → WAITING (in Redis queue)
  → ACTIVE (scraper worker picks it up)
  → SUCCESS or FAILED

On SUCCESS:
  removeOnComplete: { count: 200 } (last 200 completed jobs kept; older ones removed)

On FAILURE:
  removeOnFail: { age: 86400 }  (kept for 24h for inspection, then purged)
  → if attempts remaining: DELAYED → WAITING (exponential backoff)
  → if UnrecoverableError or no attempts left: FAILED (not retried)
```

## Error Handling in Jobs

All jobs in the scraper follow one of two patterns:

**Pattern A — retryable (InSIS:Course):**

```typescript
// Throws to trigger BullMQ retry
throw new InSISNetworkError('HTTP request failed...')

// Throws UnrecoverableError to skip retry
throw new InSISParseError('Extraction returned null...')
```

**Pattern B — fail-open (all other jobs):**

```typescript
try {
  // scrape + enqueue response
} catch (error) {
  LoggerJobContext.add({ error: ... })
  return null  // job completes as SUCCESS, no retry
}
```

The difference is intentional: Course jobs are worth retrying because a transient HTTP failure is common. Catalog and
study plan jobs are best-effort — a failed faculty/period combination is just skipped, and the next daily sync will
retry.

## Job Logging

Every job handler is wrapped in `withJobLogger` (from `../../api/src/logger.ts`):

```typescript
const requestWorker = new Worker(
	ScraperRequestQueue,
	withJobLogger(ScraperRequestQueue, ScraperRequestHandler),
	{...}
)
```

This emits a structured `job.completed` or `job.failed` log line with `duration_ms`, `job_id`, `job_name`, and
`attempt`. If the handler throws, the error is logged before being re-thrown (so BullMQ still sees the failure).

## QueueService

**File:** `../../scraper/src/Services/QueueService.ts`

Centralized, type-safe wrappers around BullMQ operations. All queue writes from within job implementations go through
this class.

### Response queue (Scraper → API)

| Method                         | Queue                | Job name                     | Payload                                        |
|--------------------------------|----------------------|------------------------------|------------------------------------------------|
| `addCatalogResponse(urls)`     | ScraperResponseQueue | `InSIS Catalog Response`     | `{ type: 'InSIS:Catalog', catalog: { urls } }` |
| `addCourseResponse(course)`    | ScraperResponseQueue | `InSIS Course Response`      | `{ type: 'InSIS:Course', course }`             |
| `addStudyPlanResponse(plan)`   | ScraperResponseQueue | `InSIS Study Plan Response`  | `{ type: 'InSIS:StudyPlan', plan }`            |
| `addStudyPlansResponse(plans)` | ScraperResponseQueue | `InSIS Study Plans Response` | `{ type: 'InSIS:StudyPlans', plans }`          |

### Request queue (enqueue more work)

| Method                                      | Queue               | Dedup key                  | Notes                         |
|---------------------------------------------|---------------------|----------------------------|-------------------------------|
| `queueCourseRequests(courses)`              | ScraperRequestQueue | `InSIS:Course:{courseId}`  | Uses `addBulk` for efficiency |
| `queueStudyPlanRequests(urls, extractIdFn)` | ScraperRequestQueue | `InSIS:StudyPlan:{planId}` | Uses `runWithConcurrency(20)` |

## Operational Notes

**Flushing Redis:** `make clear-redis` wipes all Redis data, including the scheduler entry. Run `make dev-api` (or
restart the API in production) to re-register it.

**Inspecting queues:** Redis Commander (not exposed by default) or `redis-cli` can be used to inspect waiting/active
jobs. Queue depth, throughput, and failures are visible on the Kreditožrouti — Scraper Grafana dashboard
(`bullmq_queue_depth` metric).

**Worker scaling:** The scraper accepts a worker count as a CLI argument (`node dist/index.js 4` → 4 processes). Each
process independently consumes from `ScraperRequestQueue`. Increase only if InSIS rate limits allow — the
`limiter: { max: 10, duration: 1000 }` applies per process, not globally.
