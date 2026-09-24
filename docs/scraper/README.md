# Scraper

The scraper reads InSIS pages and returns structured results to the API. It is a BullMQ worker, not an HTTP API. The API owns schedules and database writes.

## Data flow

1. The API adds a typed job to `ScraperRequestQueue`.
2. `apps/scraper/src/Handlers/ScraperRequestHandler.ts` dispatches it to a job in `apps/scraper/src/Jobs/`.
3. Extraction services parse InSIS HTML. `QueueService` adds a result to `ScraperResponseQueue`.
4. The API consumes the result and updates MySQL.

Queue names come from `@kreditozrouti/core/queue`; payload types come from `@kreditozrouti/types`. Every outbound InSIS request passes through the shared Redis rate limiter.

## Where to work

| Area | Location |
| --- | --- |
| Job routing and execution | `apps/scraper/src/Handlers/`, `apps/scraper/src/Jobs/` |
| HTML extraction | `apps/scraper/src/Services/ExtractInSIS*Service.ts` |
| HTTP client and rate limit | `apps/scraper/src/Services/InSISHTTPClientService.ts`, `InSISRateLimitService.ts` |
| Queue writes | `apps/scraper/src/Services/QueueService.ts` |
| HTML, HTTP, and concurrency helpers | `apps/scraper/src/Utils/` |
| Worker setup and config | `apps/scraper/src/bullmq.ts`, `apps/scraper/src/Config/Config.ts` |

## References

- [Jobs](JOBS.md) - each request type and result
- [Extraction](EXTRACTION.md) - source pages and parsers
- [Queue](QUEUE.md) - retries, deduplication, scheduling, and rate limit
- [Types](TYPES.md) - payload ownership and time formats
- [Internals](INTERNALS.md) - configuration, HTTP, logging, and metrics
