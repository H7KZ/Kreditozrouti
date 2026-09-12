# Scraper — CLAUDE.md

> Full reference: [docs/dev/scraper/](../docs/scraper/README.md)

---

## Directory Structure

```
scraper/src/
├── index.ts / bullmq.ts
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

| Job name           | Handler                            |
| ------------------ | ---------------------------------- |
| `InSIS:Course`     | `ScraperRequestInSISCourseJob`     |
| `InSIS:Catalog`    | `ScraperRequestInSISCatalogJob`    |
| `InSIS:StudyPlan`  | `ScraperRequestInSISStudyPlanJob`  |
| `InSIS:StudyPlans` | `ScraperRequestInSISStudyPlansJob` |

---

## Critical Invariants

**Error pattern — jobs never throw:**

```typescript
try {
	// scrape + enqueue response
} catch (e) {
	logger.add({ error: e, context: '...' })
	return null // BullMQ sees success; no automatic retry
}
```

Failed scrapes stay stale until the next scheduled run re-enqueues them.

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

**Schedulers are in the API**, not the scraper. The scraper is a pure consumer — it never schedules its own jobs.

**Response types** (`ScraperInSISCourse`, `ScraperInSISStudyPlan`) are defined in `shared/queue/insis.ts` and used by
both the scraper (producer) and the API (consumer).

---

## Test-Review Rule

After any change to extraction logic:

1. **Check** fixture coverage in `src/Tests/`
2. **Add or update** HTML fixtures in `fixtures/<service>/` (repo root) + `.scraper.json` snapshots for changed
   extraction behaviour
3. **Run** `pnpm run test` to confirm all tests pass
4. **New extraction with no test?** Use `pnpm run test:regen` to bootstrap from real HTML

Fixtures live at repo root `fixtures/` — named `*.scraper.json` (scraper output) and `*.db.json` (API parsing output).

---

## Key Docs

| Topic                                | Doc                                            |
| ------------------------------------ | ---------------------------------------------- |
| Every job type: input, output, flow  | [JOBS.md](../docs/scraper/JOBS.md)             |
| How each service parses InSIS HTML   | [EXTRACTION.md](../docs/scraper/EXTRACTION.md) |
| Queue topology, dedup, retry policy  | [QUEUE.md](../docs/scraper/QUEUE.md)           |
| All scraped data + job payload types | [TYPES.md](../docs/scraper/TYPES.md)           |
| Utils, logger context, concurrency   | [INTERNALS.md](../docs/scraper/INTERNALS.md)   |
