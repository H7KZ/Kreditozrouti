# API

The Express API serves course and study plan data, creates share and calendar links, runs timetable optimization, and coordinates scraping. The scraper sends results through BullMQ; the API writes them to MySQL.

## How it runs

`apps/api/src/index.ts` starts the worker process. Startup connects MySQL and Redis, runs migrations and seeds, starts the BullMQ response worker, registers production schedules, then listens on `API_PORT` (default `40080`). See [jobs](JOBS.md) for the queue flow.

`apps/api/src/app.ts` mounts these route groups: `/courses`, `/study_plans`, `/optimize`, `/share`, `/ical`, `/commands`, and `/admin`. It also serves `/health` and `/metrics`. See [endpoints](ENDPOINTS.md).

## Where to work

| Area | Location |
| --- | --- |
| Request validation and handlers | `apps/api/src/Controllers/` |
| Route wiring | `apps/api/src/Routes/` |
| Queries and business logic | `apps/api/src/Services/` |
| Scraper result processing | `apps/api/src/Jobs/` |
| Database schema and migrations | `apps/api/src/Database/` |
| Middleware and clients | `apps/api/src/Middlewares/`, `apps/api/src/clients/` |
| Configuration | `apps/api/src/Config/Config.ts` |

Shared HTTP, database, and queue types live in `@kreditozrouti/types`. Pure domain logic and reusable services live in `@kreditozrouti/core`. Local imports use `@api/*`.

## References

- [Endpoints](ENDPOINTS.md) - routes, payloads, and errors
- [Services](SERVICES.md) - queries, facets, scraping, and optimization
- [Response jobs](JOBS.md) - persistence and schedules
- [Database](DATABASE.md) - tables, time encoding, and migrations
- [Internals](INTERNALS.md) - configuration, caching, limits, and logging
