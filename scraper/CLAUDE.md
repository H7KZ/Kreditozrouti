# scraper/CLAUDE.md

Comprehensive reference for the scraper package. Reads this file to understand job types, routing, HTTP vs browser strategy, and queue flow — without needing to explore source files.

---

## Directory Structure

```
scraper/src/
├── index.ts                                    # Entry: cluster + worker startup
├── bullmq.ts                                   # Queue, worker, Sentry wrapper
│
├── Jobs/                                       # One file per job type
│   ├── ScraperRequestInSISCourseJob.ts         # Scrape single course syllabus
│   ├── ScraperRequestInSISCatalogJob.ts        # Scrape course catalog (all faculties)
│   ├── ScraperRequestInSISStudyPlanJob.ts      # Scrape single study plan
│   └── ScraperRequestInSISStudyPlansJob.ts     # BFS traversal of study plans hierarchy
│
├── Handlers/
│   └── ScraperRequestHandler.ts                # Routes request jobs by type to Job classes
│
└── Services/
    ├── InSISQueueService.ts                    # Type-safe wrappers for adding jobs to queues
    ├── ExtractInSISCourseService.ts            # Cheerio parser: HTML → ScraperInSISCourse
    └── ExtractInSISStudyPlanService.ts         # Cheerio parser: HTML → ScraperInSISStudyPlan
```

---

## Startup Sequence (`index.ts`)

1. Cluster master forks N worker processes (CLI arg, default 1); auto-restarts crashed workers
2. Each worker:
    - Connects to Redis via ioredis
    - Calls `bullmq.waitForQueues()` (waits for queue connections to be ready)
    - Starts processing jobs from `ScraperRequestQueue`

---

## BullMQ Configuration (`bullmq.ts`)

**Queues:**

| Queue name             | Direction                | Owner                          |
| ---------------------- | ------------------------ | ------------------------------ |
| `ScraperRequestQueue`  | API → Scraper (inbound)  | API enqueues, Scraper consumes |
| `ScraperResponseQueue` | Scraper → API (outbound) | Scraper enqueues, API consumes |

**Worker:**

- Queue: `ScraperRequestQueue`
- Concurrency: **1** (serial — one job at a time per worker process)
- Error tracking: each job wrapped in `withSentryJobHandler`
- Failed jobs are logged but not crashed (return `null` on error)

---

## Job Routing (`ScraperRequestHandler.ts`)

Jobs are routed by `job.name`:

| Job name           | Handler class                      |
| ------------------ | ---------------------------------- |
| `InSIS:Course`     | `ScraperRequestInSISCourseJob`     |
| `InSIS:Catalog`    | `ScraperRequestInSISCatalogJob`    |
| `InSIS:StudyPlan`  | `ScraperRequestInSISStudyPlanJob`  |
| `InSIS:StudyPlans` | `ScraperRequestInSISStudyPlansJob` |

---

## Job Reference

### `ScraperRequestInSISCourseJob` — single course

**Input:** `{ url: string }`

**Flow:**

1. Extract course ID from URL
2. GET the page via `createInSISClient('course')` (Axios, Czech lang header)
3. Parse HTML with `ExtractInSISCourseService.extract(html, url)`
4. `InSISQueueService.addCourseResponse(course)` → `ScraperResponseQueue`

**Returns:** `ScraperInSISCourse | null`

---

### `ScraperRequestInSISCatalogJob` — full course catalog

**Input:** `{ faculty_ids?: string[], years?: number[], semesters?: string[], queue_courses?: boolean }`

**Flow:**

1. Fetch InSIS extended search page, extract available faculty+period combinations
2. Filter by `faculty_ids`/`years`/`semesters` if provided
3. For each combination: POST search request, extract course URLs from results
4. `InSISQueueService.addCatalogResponse(urls)` → `ScraperResponseQueue`
5. If `queue_courses = true`: also calls `InSISQueueService.queueCourseRequests(courses)` to auto-enqueue individual course jobs

**Returns:** `void | null`

---

### `ScraperRequestInSISStudyPlanJob` — single study plan

**Input:** `{ url: string }`

**Flow:**

1. Extract study plan ID from URL
2. GET the page
3. Parse HTML with `ExtractInSISStudyPlanService.extract(html, url)`
4. `InSISQueueService.addStudyPlanResponse(plan)` → `ScraperResponseQueue`

**Returns:** `void | null`

---

### `ScraperRequestInSISStudyPlansJob` — study plans hierarchy

**Input:** `{ faculty_ids?: string[], years?: number[], semesters?: string[], queue_plans?: boolean }`

**Flow:**

1. BFS traversal of the study plans hierarchy (faculty → program → specialization → plan)
2. Max depth: 8 levels; concurrency: 10 parallel HTTP requests
3. Filters by faculty/year/semester if provided
4. Collects leaf URLs (actual study plan pages) at each level
5. `InSISQueueService.addStudyPlansResponse({ urls })` → `ScraperResponseQueue`
6. If `queue_plans = true`: also calls `InSISQueueService.queueStudyPlanRequests(urls)` to auto-enqueue individual plan jobs

**Returns:** `{ urls: string[] } | null`

---

## HTTP vs Puppeteer

**Puppeteer is installed but NOT used for scraping.** All HTTP requests use **Axios** via `createInSISClient(type)`. InSIS pages are server-rendered HTML — no JS execution required.

Puppeteer is a legacy dependency; do not add new Puppeteer-based scrapers unless a page requires JS rendering.

---

## Queue Service (`InSISQueueService.ts`)

Static helpers that add jobs to queues with correct types and deduplication keys.

**Response queue (Scraper → API):**

| Method                          | Job type           | Description                      |
| ------------------------------- | ------------------ | -------------------------------- |
| `addCourseResponse(course)`     | `InSIS:Course`     | Send scraped course to API       |
| `addCatalogResponse(urls)`      | `InSIS:Catalog`    | Send discovered URLs to API      |
| `addStudyPlanResponse(plan)`    | `InSIS:StudyPlan`  | Send scraped study plan to API   |
| `addStudyPlansResponse({urls})` | `InSIS:StudyPlans` | Send discovered plan URLs to API |

**Request queue (enqueue more work):**

| Method                                                   | Dedup key                  | Notes                      |
| -------------------------------------------------------- | -------------------------- | -------------------------- |
| `queueCourseRequests(courses)`                           | `InSIS:Course:{courseId}`  | Bulk-add course URLs       |
| `queueStudyPlanRequests(urls, extractIdFn, concurrency)` | `InSIS:StudyPlan:{planId}` | Throttled by `concurrency` |

---

## Extraction Services

### `ExtractInSISCourseService`

Cheerio-based parser for InSIS course syllabus pages.

**Public API:**

```typescript
extractIdFromUrl(url: string): number | null
extractIdFromHtml(html: string): number | null
extract(html: string, url: string): ScraperInSISCourse
```

**Returns `ScraperInSISCourse`:** identity (`id`, `url`, `url_id`), course metadata (`ident`, `title_cs/en`, `ects`, `mode_of_delivery`, `mode_of_completion`, `languages`, `semester`, `year`, `level`), faculty, lecturers, syllabus fields (8 text fields), assessment methods, timetable slots, study plan memberships.

### `ExtractInSISStudyPlanService`

Cheerio-based parser for InSIS study plan pages and navigation.

**Public API:**

```typescript
extractIdFromUrl(url: string): number | null
extractFaculties(html: string): { title: string; url: string }[]
extractNavigationUrls(html: string): { texts: string[]; url: string }[]
extractPlanUrls(html: string): string[]
extract(html: string, url: string): ScraperInSISStudyPlan
```

`extractNavigationUrls` + `extractPlanUrls` are used by the BFS traversal to separate navigation nodes (programs, specializations) from leaf nodes (actual plans).

**Returns `ScraperInSISStudyPlan`:** identity (`id`, `url`, `ident`), faculty, metadata (`semester`, `year`, `level`, `mode_of_study`, `study_length`), courses (`ScraperInSISStudyPlanCourse[]` grouped by category).

---

## Error Handling

All jobs follow this pattern:

```typescript
try {
    // scrape + enqueue response
} catch (e) {
    logger.add({ error: e, context: '...' })
    return null // job completes successfully, no BullMQ retry triggered
}
```

Jobs return `null` on error — they do not throw. BullMQ sees a successful completion. Errors are surfaced only in logs and Sentry.

**Consequence:** There are no automatic retries for failed scrapes. If a course page is unavailable, it stays stale until the next scheduled catalog run re-enqueues it.

---

## Adding a New Scraping Job

1. **Create job file:** `scraper/src/Jobs/ScraperRequestInSISNewJob.ts`
    - Export a class with `async process(job: Job): Promise<ResultType | null>`
    - Follow error pattern: try/catch, log, return null on failure
    - Use Axios (not Puppeteer) unless the page requires JS

2. **Create extraction service** if new HTML parsing is needed: `scraper/src/Services/ExtractInSISNewService.ts`
    - Use Cheerio (`const $ = cheerio.load(html)`)
    - Return typed result objects

3. **Register in handler:** `scraper/src/Handlers/ScraperRequestHandler.ts`
    - Add the new job name to the routing map

4. **Add queue helper** in `InSISQueueService.ts`:
    - Add `addNewResponse(data)` for outbound results
    - Add `queueNewRequests(items)` for inbound work, with dedup key

5. **Add response handler in API:** `api/src/Jobs/ScraperResponseInSISNewJob.ts`
    - Register in `api/src/Handlers/ScraperResponseHandler.ts`

---

## Configuration

Key env vars (no prefix):

```
REDIS_URI      — Redis connection string
NODE_ENV       — local | development | production
SENTRY_DSN     — optional error tracking
```

Workers per node: set via CLI arg (default 1). Increase only if scraping throughput is the bottleneck — InSIS rate limits are the actual constraint.

---

_Last updated: 2026-05-10_
