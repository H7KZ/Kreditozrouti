# Scraper — Overview

The scraper is a standalone Node.js service responsible for fetching all course and study plan data from InSIS (VŠE's
information system). It operates entirely through a Redis-backed job queue — the API enqueues work, the scraper
processes it, and results flow back to the API via a response queue.

## Why a Separate Service?

InSIS has no public API. All data must be extracted by issuing HTTP requests that look like a real browser session and
parsing the returned HTML. This is inherently slow (hundreds of individual page fetches per catalog sync), so it runs in
a dedicated worker process that can be scaled independently of the API.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        SCRAPER PROCESS                             │
│                                                                    │
│  index.ts (cluster manager)                                        │
│    └─ forks N worker processes (default 1)                         │
│         └─ each worker:                                            │
│              ├─ connects to Redis                                  │
│              └─ starts BullMQ Worker on ScraperRequestQueue        │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ScraperRequestQueue (Redis)  ← API enqueues jobs            │  │
│  │                                                              │  │
│  │  ScraperRequestHandler  (routes by job.data.type)            │  │
│  │    ├─ InSIS:Catalog    → ScraperRequestInSISCatalogJob       │  │
│  │    ├─ InSIS:Course     → ScraperRequestInSISCourseJob        │  │
│  │    ├─ InSIS:StudyPlans → ScraperRequestInSISStudyPlansJob    │  │
│  │    └─ InSIS:StudyPlan  → ScraperRequestInSISStudyPlanJob     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌───────────────────────────────────────────────────────┐         │
│  │  ScraperResponseQueue (Redis)  → API consumes results │         │
│  └───────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────┘
```

## Complete Data Flow

```
1. API scheduler runs at 3 AM on registration months (Jan, Feb, Jun–Sep, Nov, Dec)
   └─ enqueues InSIS:Catalog job directly

2. Scraper runs Catalog job (two phases)
   Phase 1: GET extended search page → discover faculties + academic periods
   Phase 2: POST search form for each faculty/period → collect course URLs
   └─ sends URL list back via ScraperResponseQueue (InSIS:Catalog response)
   └─ if auto_queue_courses=true: enqueues one InSIS:Course job per URL

3. Scraper runs Course jobs (one per syllabus page)
   └─ GET course page, parse HTML
   └─ sends ScraperInSISCourse object via ScraperResponseQueue

4. API receives results from ScraperResponseQueue
   └─ ScraperResponseInSISCourseJob: upserts course + units + slots → MySQL
```

Study plan syncing follows an equivalent path via `InSIS:StudyPlans` and `InSIS:StudyPlan` jobs.

## Directory Structure

```
scraper/src/
├── index.ts                          # Cluster manager + worker startup
├── bullmq.ts                         # Queue and worker initialization
├── sentry.ts                         # Error tracking integration
│
├── Config/
│   └── Config.ts                     # Env vars, InSIS URLs, runtime helpers
│
├── Context/
│   └── LoggerJobContext.ts           # AsyncLocalStorage wide-event logger
│
├── Errors/
│   └── InSISErrors.ts                # InSISNetworkError, InSISParseError
│
├── Handlers/
│   └── ScraperRequestHandler.ts      # Routes jobs by type to job functions
│
├── Jobs/                             # One file per job type
│   ├── ScraperRequestInSISCatalogJob.ts
│   ├── ScraperRequestInSISCourseJob.ts
│   ├── ScraperRequestInSISStudyPlansJob.ts
│   └── ScraperRequestInSISStudyPlanJob.ts
│
├── Services/
│   ├── QueueService.ts               # Type-safe BullMQ helpers
│   ├── InSISHTTPClientService.ts     # Axios wrapper with logging
│   ├── ExtractInSISCatalogService.ts # HTML → catalog search options + URLs
│   ├── ExtractInSISCourseService.ts  # HTML → ScraperInSISCourse
│   ├── ExtractInSISStudyPlanService.ts # HTML → ScraperInSISStudyPlan
│   ├── MarkdownService.ts            # Cheerio element → Markdown
│   └── DateService.ts               # Date/time string parsing
│
├── Utils/
│   ├── ConcurrencyUtils.ts           # runWithConcurrency()
│   ├── HTTPUtils.ts                  # InSIS request headers, lang helpers
│   ├── HTMLUtils.ts                  # Cheerio helpers (cleanText, etc.)
│   └── InSISUtils.ts                 # Group code parser, semester/year extractor
│
└── types/
    ├── insis.ts                      # Re-exports from @shared/domain/insis + @shared/queue/insis
    ├── jobs.ts                       # Re-exports from @shared/queue/jobs
    └── queue.ts                      # Queue name constants
```

## Technology Choices

| Concern             | Library              | Why                                                                             |
|---------------------|----------------------|---------------------------------------------------------------------------------|
| HTTP requests       | Axios                | InSIS pages are server-rendered — no JavaScript execution needed.               |
| HTML parsing        | Cheerio              | Lightweight jQuery-like API; no browser overhead.                               |
| Markdown conversion | Turndown             | Converts rich text sections (literature, course contents) to portable Markdown. |
| Job queue           | BullMQ + Redis       | Reliable, persistent, supports deduplication and retries.                       |
| Error tracking      | Sentry               | Wraps each job in a Sentry transaction; captures uncaught exceptions.           |
| Logging             | Pino (JSON)          | Structured wide-event logging via AsyncLocalStorage.                            |
| Concurrency         | `runWithConcurrency` | Custom pool; controls parallelism for bulk HTTP requests.                       |

## Further Reading

- [Jobs reference](JOBS.md) — every job type: input, output, flow, error handling
- [HTML extraction](EXTRACTION.md) — how each service parses InSIS HTML
- [Queue & BullMQ](QUEUE.md) — queue topology, deduplication, retry policy, scheduler
- [Type reference](TYPES.md) — all interfaces for scraped data and job payloads
- [Internals](INTERNALS.md) — utils, logger context, error classes, concurrency
