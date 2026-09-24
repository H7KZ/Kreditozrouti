# Scraper - AGENTS.md

> Full reference: [docs/scraper/](../docs/scraper/README.md)

---

## Directory Structure

```
scraper/src/
├── index.ts / bullmq.ts
├── metrics.ts                # prom-client + /metrics on :9101 per replica: worker metrics, scraper_silent_failures_total
├── Config/Config.ts          # Env vars, InSIS URLs
├── Context/LoggerJobContext.ts
├── Errors/InSISErrors.ts     # InSISNetworkError, InSISParseError, InSISRateLimitError, InSISRateLimitWaitError
├── Handlers/ScraperRequestHandler.ts  # Routes jobs by type
├── Jobs/                     # One file per job type
├── Services/
│   ├── QueueService.ts
│   ├── InSISHTTPClientService.ts
│   ├── InSISRateLimitService.ts   # Global Redis token bucket for outbound InSIS requests
│   ├── ExtractInSISCatalogService.ts
│   ├── ExtractInSISCourseService.ts
│   └── ExtractInSISStudyPlanService.ts
└── Utils/                    # ConcurrencyUtils, HTTPUtils, HTMLUtils, InSISUtils
```

---

## Job Routing

`Handlers/ScraperRequestHandler.ts` maps all eight request job names to their `Jobs/` handlers. See [job flows](../docs/scraper/JOBS.md) for input and output behavior.

---

## Critical Invariants

**Failure behavior:** `ScraperRequestHandler` rethrows job errors. The request queue retries failed jobs up to three attempts with exponential backoff; rate-limit errors may delay a job. Some discovery and plan handlers catch an InSIS error and return `null` after calling `recordSilentFailure(jobType)`. Check the specific handler before changing retry behavior.

**Worker concurrency: 1** (serial per worker process). InSIS rate limits are the real constraint, not CPU.

**Global InSIS rate limit:** every outbound InSIS request passes through the axios request interceptor in
`InSISHTTPClientService`, which awaits `acquireInSISRequestSlot()` from `Services/InSISRateLimitService.ts`. That is a
Redis token bucket driven by a single atomic Lua script, so the ceiling holds across replicas, across worker
concurrency and across every job type - axios-retry attempts included. Tuned by `INSIS_RATE_LIMIT_RPS` (default 4),
`INSIS_RATE_LIMIT_BURST` (default 8) and `INSIS_RATE_LIMIT_MAX_WAIT_MS` (default 30000). It fails closed: if Redis
cannot be consulted, the request is refused with `InSISRateLimitWaitError` rather than sent unpaced. Never add a
`SCRAPER_CONCURRENCY` env var - see
[ADR 0002](../docs/adr/0002-global-insis-rate-limit-not-a-concurrency-knob.md). The `FACULTY_CONCURRENCY` /
`CATALOG_CONCURRENCY` / `BFS_CONCURRENCY` constants in `Jobs/` are throughput tuning only, not safety limits.

**Schedulers are in the API**, not the scraper. The scraper is a pure consumer - it never schedules its own jobs.

**Response types** (`ScraperInSISCourse`, `ScraperInSISStudyPlan`) are defined in `packages/types/src/queue.ts` and used by
both the scraper (producer) and the API (consumer).

---

## Extraction Review Rule

After any change to extraction logic:

1. **Check** existing fixture coverage in `src/Tests/`
2. **Report** any fixture or snapshot updates that are needed, then ask before writing them
3. **Run** existing tests when relevant to verify the extraction change

Fixtures live at repo root `fixtures/` - named `*.scraper.json` (scraper output) and `*.db.json` (API parsing output).

**Every silent failure is counted.** A job that catches an InSIS error and returns null calls
`recordSilentFailure(jobType)` (`src/metrics.ts`), because BullMQ records it as a success. Each replica serves its own
`/metrics` on `SCRAPER_METRICS_PORT` (9101, matching the compose `prometheus.io/port` label); keep one worker process per
container, since cluster forks would share the port.

---

## Key Docs

| Topic                                | Doc                                            |
| ------------------------------------ | ---------------------------------------------- |
| Every job type: input, output, flow  | [JOBS.md](../docs/scraper/JOBS.md)             |
| How each service parses InSIS HTML   | [EXTRACTION.md](../docs/scraper/EXTRACTION.md) |
| Queue topology, dedup, retry policy  | [QUEUE.md](../docs/scraper/QUEUE.md)           |
| Type overview; exact payloads in `packages/types/src/queue.ts` | [TYPES.md](../docs/scraper/TYPES.md) |
| Utils, logger context, concurrency   | [INTERNALS.md](../docs/scraper/INTERNALS.md)   |
