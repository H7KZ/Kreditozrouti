# Scraper — Queue & BullMQ

The scraper communicates with the API entirely through two BullMQ queues backed by Redis. This document covers the queue topology, job lifecycle, deduplication, retry policy, and how the API scheduler triggers the scraper.

## Queue Topology

```
┌────────────────────────────────────────────────────────────┐
│  API Process                                               │
│  ┌──────────────────────┐   ┌─────────────────────────┐    │
│  │ ScraperRequestQueue  │   │ ScraperResponseQueue    │    │
│  │   (producer)         │   │   (consumer — Worker)   │    │
│  │                      │   │   concurrency: 4        │    │
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
│  │   concurrency: 5     │   │                         │    │
│  │   rate: 10/sec       │   │                         │    │
│  └──────────────────────┘   └─────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

Both sides reference the same two Redis queue names (defined in `@shared/queue/names`). The direction is determined by which side creates a `Queue` (producer) vs a `Worker` (consumer).

## Queue Names

| Constant | Queue name | Direction |
|---|---|---|
| `ScraperRequestQueue` | `scraper:request` | API → Scraper |
| `ScraperResponseQueue` | `scraper:response` | Scraper → API |

## Scraper-side Configuration (`scraper/src/bullmq.ts`)

### Request Worker

```typescript
new Worker(ScraperRequestQueue, handler, {
  concurrency: 5,
  limiter: { max: 10, duration: 1000 }
})
```

- **Concurrency 5:** up to 5 jobs run simultaneously per worker process. Combined with the cluster (default 1 process), this means 5 concurrent scrapes per node.
- **Limiter 10/sec:** hard cap of 10 job starts per second, regardless of concurrency. This is the primary InSIS rate-limit guard.

### Default Job Options

```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 }
}
```

All jobs on `ScraperRequestQueue` get 3 attempts with exponential backoff starting at 10 seconds (10s → 20s → 40s). This applies only to jobs that throw a retryable error — jobs that throw `UnrecoverableError` (such as `InSISParseError`) skip the retry queue immediately.

### Response Queue

The response queue is a plain `Queue` (producer only). The scraper writes results into it; the API consumes them.

## API-side Configuration (`api/src/bullmq.ts`)

### Response Worker

```typescript
new Worker(ScraperResponseQueue, handler, {
  concurrency: 4
})
```

Processes incoming results from the scraper. Each job is handled by `ScraperResponseHandler`, which routes by `job.data.type` to the appropriate response job class (`ScraperResponseInSISCourseJob` or `ScraperResponseInSISStudyPlanJob`).

### Scheduler

The API registers a BullMQ job scheduler (repeatable job) on startup:

```typescript
// Production only (Config.isEnvProduction())
await scraperRequestQueue.upsertJobScheduler(
  'SupervisorScheduler',
  { pattern: '0 3 * * *' },   // daily at 3 AM
  { name: 'InSIS:Supervisor', data: { type: 'InSIS:Supervisor' } }
)
```

The scheduler entry is stored in Redis. At 3 AM, BullMQ automatically adds a new `InSIS:Supervisor` job to `ScraperRequestQueue`. The scraper then picks it up.

The API also removes old scheduler IDs on startup:
```typescript
await scraperRequestQueue.removeJobScheduler(ScraperInSISCatalogRequestScheduler)
await scraperRequestQueue.removeJobScheduler(ScraperInSISStudyPlansRequestScheduler)
```
These were the previous direct-schedule approach, replaced by the Supervisor pattern.

**In development:** The scheduler is disabled. Trigger scrapes manually via the `/commands/insis/*` API endpoints.

## Deduplication

BullMQ's built-in deduplication prevents the same logical job from being queued multiple times within a TTL window. The scraper uses it to avoid re-scraping courses that are already queued.

| Job | Dedup key | TTL |
|---|---|---|
| `InSIS:Catalog` (from Supervisor) | `InSIS:Catalog:Supervisor` | 30 seconds |
| `InSIS:Course` (from catalog) | `InSIS:Course:{courseId}` | until consumed |
| `InSIS:StudyPlan` (from study plans) | `InSIS:StudyPlan:{planId}` | until consumed |

Course and study plan dedup keys have no TTL, meaning a course already sitting in the queue will not be re-added even if the catalog job runs again before the scraper processes it.

## Job Lifecycle

```
API enqueues job
  → WAITING (in Redis queue)
  → ACTIVE (scraper worker picks it up)
  → SUCCESS or FAILED

On SUCCESS:
  removeOnComplete: true (job removed from Redis immediately)

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

The difference is intentional: Course jobs are worth retrying because a transient HTTP failure is common. Catalog and study plan jobs are best-effort — a failed faculty/period combination is just skipped, and the next daily sync will retry.

## Sentry Integration

Every job handler is wrapped in `withSentryJobHandler`:

```typescript
const requestWorker = new Worker(
  ScraperRequestQueue,
  withSentryJobHandler(ScraperRequestQueue, ScraperRequestHandler),
  { ... }
)
```

This creates a Sentry transaction (`op: 'queue.process'`) per job and attaches `job.id` and `job.data` as context. If the handler throws, the error is captured before being re-thrown (so BullMQ still sees the failure).

## QueueService

**File:** `scraper/src/Services/QueueService.ts`

Centralized, type-safe wrappers around BullMQ operations. All queue writes from within job implementations go through this class.

### Response queue (Scraper → API)

| Method | Queue | Job name | Payload |
|---|---|---|---|
| `addCatalogResponse(urls)` | ScraperResponseQueue | `InSIS Catalog Response` | `{ type: 'InSIS:Catalog', catalog: { urls } }` |
| `addCourseResponse(course)` | ScraperResponseQueue | `InSIS Course Response` | `{ type: 'InSIS:Course', course }` |
| `addStudyPlanResponse(plan)` | ScraperResponseQueue | `InSIS Study Plan Response` | `{ type: 'InSIS:StudyPlan', plan }` |
| `addStudyPlansResponse(plans)` | ScraperResponseQueue | `InSIS Study Plans Response` | `{ type: 'InSIS:StudyPlans', plans }` |

### Request queue (enqueue more work)

| Method | Queue | Dedup key | Notes |
|---|---|---|---|
| `queueCourseRequests(courses)` | ScraperRequestQueue | `InSIS:Course:{courseId}` | Uses `addBulk` for efficiency |
| `queueStudyPlanRequests(urls, extractIdFn)` | ScraperRequestQueue | `InSIS:StudyPlan:{planId}` | Uses `runWithConcurrency(20)` |
| `enqueueCatalogRequest(data)` | ScraperRequestQueue | `InSIS:Catalog:Supervisor` TTL 30s | Called by Supervisor job |

## Operational Notes

**Flushing Redis:** `make clear-redis` wipes all Redis data, including the scheduler entry. Run `make dev-api` (or restart the API in production) to re-register it.

**Inspecting queues:** Redis Commander (not exposed by default) or `redis-cli` can be used to inspect waiting/active jobs. BullMQ board packages like `bull-board` can be added for a UI.

**Worker scaling:** The scraper accepts a worker count as a CLI argument (`node dist/index.js 4` → 4 processes). Each process independently consumes from `ScraperRequestQueue`. Increase only if InSIS rate limits allow — the `limiter: { max: 10, duration: 1000 }` applies per process, not globally.
