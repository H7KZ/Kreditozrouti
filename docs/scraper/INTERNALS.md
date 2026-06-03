# Scraper — Internals

This document covers the cross-cutting infrastructure that all jobs rely on: startup and clustering, the logger, error
classes, HTTP infrastructure, and the utilities.

---

## Startup & Clustering (`index.ts`)

The scraper uses Node.js's built-in `cluster` module to run multiple worker processes from a single entry point.

```
node dist/index.js [N]
  N = number of worker processes (default: 1)
```

**Single-worker mode (N=1 or omitted):**  
Skips the cluster code entirely and calls `startWorker()` directly in the main process. Simpler, lower overhead, the
typical development and single-node production setup.

**Multi-worker mode (N>1):**  
The primary process forks N workers and monitors them. On `exit`, it forks a replacement immediately — no manual restart
needed.

```
startWorker():
  1. redis.ping()               → verify Redis connectivity
  2. scraper.init()             → attach error/failure event listeners
  3. scraper.waitForQueues()    → wait for BullMQ queue+worker connections
  4. (ready to process jobs)
```

If any step throws, the process logs the error, disconnects Redis, and exits with code 1.

---

## Logger (`Context/LoggerJobContext.ts`)

The scraper uses a **wide-event logging** pattern: instead of emitting many small log lines during a job, it accumulates
key-value pairs throughout the call stack and emits a single JSON log line at the end.

This is implemented via Node.js `AsyncLocalStorage`, which acts as a request-scoped store without requiring explicit
parameter passing.

```typescript
// In ScraperRequestHandler — creates the log context for this job execution
await LoggerJobContext.run(async () => {
  await handler(job)
}, {
  job_id: job.id,
  job_name: job.name,
  queue_name: job.queueName,
  attempt: job.attemptsMade + 1,
  timestamp: new Date().toISOString()
})

// In any job or service — accumulates fields without knowing the caller
LoggerJobContext.add({ course_id: 42, url: 'https://...' })
LoggerJobContext.add({ status: 'success', duration_ms: 1234 })

// At the end of ScraperRequestHandler — emits one JSON line
LoggerJobContext.log.info(LoggerJobContext.get())
// → {"level":"INFO","time":"...","job_id":"...","course_id":42,"status":"success","duration_ms":1234,...}
```

**Why wide events?** A single JSON object is far easier to query in log aggregators (Grafana, Loki, etc.) than
scattered multi-line logs. You can filter `status=failed AND attempt>2` with a single index scan.

### Root logger (`scraper/src/logger.ts`)

A Pino root logger is created once and binds `service: 'scraper'` on every line. `LoggerJobContext.log` is a child
logger derived from this root — no separate logger instantiation is needed in individual jobs.

```typescript
// Root logger (scraper/src/logger.ts) — binds service: 'scraper'
// LoggerJobContext.log = logger.child({ context: 'job' })
```

No wrapper function is needed: `ScraperRequestHandler` owns the full job lifecycle (AsyncLocalStorage setup,
field accumulation, final emit) directly.

### `JobWideEvent` interface

```typescript
interface JobWideEvent {
  // Always present (set in ScraperRequestHandler)
  job_id: string
  job_name: string
  queue_name: string
  attempt: number
  timestamp: string

  // Set by ScraperRequestHandler on completion
  duration_ms?: number
  status?: 'success' | 'failed' | 'skipped' | 'dispatching_catalog'
  error_message?: string

  // Dynamic — any job can add arbitrary fields
  [key: string]: unknown
}
```

**Pino** is used as the underlying logger with ISO timestamps and uppercase level labels. Output is structured JSON to
stdout; Alloy reads Docker stdout and ships to Loki.

---

## Error Classes (`Errors/InSISErrors.ts`)

Two distinct error types control BullMQ's retry behavior.

### `InSISNetworkError`

```typescript
class InSISNetworkError extends Error {
  name = 'InSISNetworkError'
}
```

Thrown when an HTTP request fails (4xx, 5xx, network timeout). BullMQ treats this as a normal failure and applies the
retry policy (3 attempts, exponential backoff starting at 10 seconds).

**Use when:** the failure is transient and retrying makes sense.

### `InSISParseError`

```typescript
class InSISParseError extends UnrecoverableError {
  name = 'InSISParseError'
}
```

Thrown when HTML parsing fails. Extends BullMQ's `UnrecoverableError`, which causes BullMQ to immediately move the job
to the failed state without any retries.

**Use when:** the failure is deterministic — retrying the same page will produce the same broken parse.

**Currently only `InSIS:Course` jobs use these errors.** All other jobs use the fail-open pattern (catch, log, return
null) because partial failures are acceptable in bulk operations.

---

## HTTP Client (`Services/InSISHTTPClientService.ts`)

All HTTP requests go through `InSISHTTPClientService`, a thin Axios wrapper that:

- Merges InSIS-specific browser headers with every request
- Logs errors to `LoggerJobContext` automatically
- Returns a discriminated union (`HttpResult<T> | HttpError`) instead of throwing

```typescript
interface HttpResult<T> { success: true; data: T; response: AxiosResponse<T> }
interface HttpError    { success: false; error: Error | AxiosError; status?: number }

type HttpResponse<T> = HttpResult<T> | HttpError
```

This forces callers to handle both cases explicitly rather than wrapping every call in try/catch.

**Three methods:**

| Method               | Returns                    | Use case                                         |
|----------------------|----------------------------|--------------------------------------------------|
| `get<T>(url)`        | `HttpResponse<T>`          | Single, important fetch (check `result.success`) |
| `post<T>(url, data)` | `HttpResponse<T>`          | Search form submission                           |
| `getSilent<T>(url)`  | `AxiosResponse<T> \| null` | Bulk fetch where failures are silently skipped   |

`getSilent` is used in the BFS traversal in `ScraperRequestInSISStudyPlansJob` where 1-of-10 concurrent fetches failing
should not abort the whole traversal.

**Factory:**

```typescript
export function createInSISClient(logPrefix?: string): InSISHTTPClientService
```

The `logPrefix` scopes log keys to avoid collisions when multiple clients run concurrently (e.g., `catalog_error` vs
`course_error`).

---

## HTTP Headers (`Utils/HTTPUtils.ts`)

InSIS uses standard web anti-scraping signals. The scraper mimics a modern Chrome browser:

```typescript
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...',
  'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
  'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", ...',
  'sec-ch-ua-platform': '"Windows"',
  'Upgrade-Insecure-Requests': '1',
  Referer: 'https://insis.vse.cz',
  ...
}
```

**`withCzechLang(url)`** appends `lang=cz` to force Czech-language responses (InSIS otherwise serves English for some
faculties based on Accept-Language). Uses `;` as a separator when the URL already has a `?` parameter, matching InSIS's
own URL convention.

---

## Concurrency (`Utils/ConcurrencyUtils.ts`)

```typescript
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]>
```

A simple worker-pool implementation using a shared iterator. Creates `Math.min(items.length, concurrency)` concurrent
async workers, each pulling from the iterator until exhausted. Results are written back to a pre-allocated array by
index to preserve order.

**Error handling:** Individual item failures are caught and logged (`console.error`) but do not abort other items. The
slot in `results` for a failed item is `undefined` — callers should guard against this.

**Use cases:**

- BFS study plans traversal: 10 concurrent HTTP fetches
- Study plan request enqueue: 20 concurrent Redis writes

---

## InSIS Domain Utilities (`Utils/InSISUtils.ts`)

### `extractSemester(value)` → `InSISSemester | null`

Searches for `ZS` or `LS` as word-boundary tokens (start, middle, or end of string). Case-insensitive via
`.toUpperCase()`. Returns null if neither found.

### `extractYear(value)` → `number | null`

Matches the pattern `YYYY/YYYY` (e.g., `2024/2025`) and returns the first year component as a number. Academic years are
identified by their starting year.

### `parseGroupCode(groupCode)` → `{group, category}`

Decodes an InSIS group code (e.g., `"oP"`, `"cVM"`, `"hSZ"`, `"cTVS1"`) into structured `group` and `category` values.

- **First character (lowercase)** → group scope via `GroupPrefixes` map
- **Remaining characters (uppercased)** → category via `CategoryRules` (ordered list, first match wins)

Rules are checked from most-specific to least-specific. `ZEXCN` is checked before `EXC` to prevent false matches. `TVS`,
`SZ`, and `VOR` are checked before the generic `V` pattern.

Default fallbacks: `group='university_wide'`, `category='elective'`.

---

## Date Service (`Services/DateService.ts`)

Utility for parsing Czech/European date strings into JavaScript `Date` objects. Supports 40+ format variants including
`D. M. YYYY`, `DD.MM.YY`, `YYYY-MM-DD`, `MM/DD/YYYY`, etc.

```typescript
DateService.extractDateTimeFromString('15. 10. 2024 9:15')
// → { datetime: Date, date: Date, time: '09:15' }

DateService.extractDateTimeFromString('not-a-date')
// → { datetime: null, date: null, time: null }
```

Uses the `moment` library with Prague timezone offset. Not currently called in the main scraping path (timetable dates
are stored as raw strings); available for future use or post-processing.

---

## Configuration (`Config/Config.ts`)

Environment variables are loaded from `.env` files (searched from the distribution directory upward). All InSIS base
URLs are hardcoded as defaults and not configurable via env — they only change if InSIS itself changes.

```typescript
Config.insis.baseDomain                // 'https://insis.vse.cz'
Config.insis.catalogUrl                // 'https://insis.vse.cz/katalog/'
Config.insis.catalogExtendedSearchUrl  // '.../katalog/index.pl?jak=rozsirene'
Config.insis.studyPlansUrl             // '.../katalog/plany.pl?lang=cz'
Config.insis.defaultReferrer           // 'https://insis.vse.cz'
```

**Environment helpers:**

```typescript
Config.isEnvLocal()        // env === 'localhost' | 'local'
Config.isEnvDevelopment()  // env === 'dev' | 'development'
Config.isEnvProduction()   // env === 'production' | 'prod'
```

**Required env vars:**

```
REDIS_URI       — Redis connection string (e.g. redis://localhost:46379)
REDIS_PASSWORD  — Optional Redis password
ENV             — Runtime environment (default: 'development')
```
