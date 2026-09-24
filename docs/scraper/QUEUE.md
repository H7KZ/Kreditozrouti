# Scraper queues

The API produces on `ScraperRequestQueue` and consumes `ScraperResponseQueue`; the scraper does the reverse. Names are defined in [`packages/core/src/queue/names.ts`](../../packages/core/src/queue/names.ts). Payloads are discriminated unions in [`packages/types/src/queue.ts`](../../packages/types/src/queue.ts).

## Workers and retries

| Worker | Concurrency | Stall recoveries |
| --- | ---: | ---: |
| Scraper request worker | 1 per process | 3 |
| API response worker | 2 per process | 2 |

Scraper request jobs use three attempts, exponential backoff starting at 10 seconds, and retain the last 200 completed jobs. Response jobs use three attempts with backoff starting at 5 seconds. Failed jobs are retained for 24 hours. A returned `null` counts as completed; thrown errors trigger retry or failure. HTTP 429 handling can move a scraper job to BullMQ's delayed set.

`QueueService` deduplicates course requests for five minutes and plan, academic-period, and faculty-timetable requests for one hour. Manual API discovery commands also have short deduplication windows.

## InSIS rate limit

The BullMQ worker's concurrency is not the outbound request limit: discovery jobs fan out within a single job. The Axios request interceptor reserves a slot in one Redis token bucket for every InSIS request, including retries. Defaults are `INSIS_RATE_LIMIT_RPS=4`, `INSIS_RATE_LIMIT_BURST=8`, and `INSIS_RATE_LIMIT_MAX_WAIT_MS=30000`. If Redis cannot be consulted, the request is refused. See [ADR 0002](../adr/0002-global-insis-rate-limit-not-a-concurrency-knob.md).

The API registers production schedules for course and plan discovery, academic events, faculty visibility, and missing-course sweeps. See [API jobs](../api/JOBS.md#production-schedules). Development runs use [operator commands](../api/ENDPOINTS.md#operator-routes).

Queue depth and worker outcomes are exposed through the API and scraper metrics endpoints. Restart the API after clearing Redis so it can register schedules again.
