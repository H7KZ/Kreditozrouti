# Data flow

## Course search

1. Web filters trigger an API course request.
2. The API validates filters and queries MySQL through shared core services.
3. The API returns course DTOs and facets from `@kreditozrouti/types`; the web renders results and timetable statuses.

See [API endpoints](../api/ENDPOINTS.md) and [web stores](../web/STORES.md).

## Course refresh

1. The API schedules a BullMQ scrape request. Production schedulers and user-triggered refreshes use the same request queue.
2. The scraper fetches and parses InSIS, then places a typed result on the response queue.
3. The API consumes the result, updates MySQL, invalidates affected cache entries, and publishes a course update for live clients.

The scraper never writes MySQL directly. See [scraper jobs](../scraper/JOBS.md) and [API jobs](../api/JOBS.md).

## Shared encoding

Times are minutes from midnight (`08:00` is `480`). Domain functions and DTOs live in [`packages/core/`](../../packages/core/src/domain/index.ts) and [`packages/types/`](../../packages/types/src/index.ts).
