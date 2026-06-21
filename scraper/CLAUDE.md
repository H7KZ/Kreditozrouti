# Scraper — CLAUDE.md

> Full reference: [docs/scraper/](../docs/scraper/README.md)

---

## Directory Structure

```
scraper/src/
├── index.ts / bullmq.ts
├── Config/Config.ts          # Env vars, InSIS URLs
├── Context/LoggerJobContext.ts
├── Errors/InSISErrors.ts     # InSISNetworkError, InSISParseError
├── Handlers/ScraperRequestHandler.ts  # Routes jobs by type
├── Jobs/                     # One file per job type
├── Services/
│   ├── QueueService.ts
│   ├── InSISHTTPClientService.ts
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

**Schedulers are in the API**, not the scraper. The scraper is a pure consumer — it never schedules its own jobs.

**Response types** (`ScraperInSISCourse`, `ScraperInSISStudyPlan`) are defined in `shared/queue/insis.ts` and used by
both the scraper (producer) and the API (consumer).

---

## Key Docs

| Topic                                    | Doc                                                  |
| ---------------------------------------- | ---------------------------------------------------- |
| System architecture, services, data flow | [docs/architecture/](../docs/architecture/README.md) |
| Every job type: input, output, flow      | [JOBS.md](../docs/scraper/JOBS.md)                   |
| How each service parses InSIS HTML       | [EXTRACTION.md](../docs/scraper/EXTRACTION.md)       |
| Queue topology, dedup, retry policy      | [QUEUE.md](../docs/scraper/QUEUE.md)                 |
| All scraped data + job payload types     | [TYPES.md](../docs/scraper/TYPES.md)                 |
| Utils, logger context, concurrency       | [INTERNALS.md](../docs/scraper/INTERNALS.md)         |
