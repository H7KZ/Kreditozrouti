# API — Documentation Index

The API documentation is split into focused files for easier navigation.

## Documents

| File                                 | Contents                                                                                                   |
|--------------------------------------|------------------------------------------------------------------------------------------------------------|
| [api/README.md](api/README.md)       | Architecture overview, startup sequence, directory structure, path aliases                                 |
| [api/ENDPOINTS.md](api/ENDPOINTS.md) | All routes and controllers: request/response shapes, rate limits, SSE flow, error format                   |
| [api/SERVICES.md](api/SERVICES.md)   | CourseService (N+1 avoidance, facets, cross-filtering, full-text search), StudyPlanService, ScraperService |
| [api/JOBS.md](api/JOBS.md)           | Response job handlers: DB sync transactions, Redis publish, cache flush, BullMQ scheduler config           |
| [api/DATABASE.md](api/DATABASE.md)   | Full schema reference, time encoding, Kysely patterns, migration guide                                     |
| [api/INTERNALS.md](api/INTERNALS.md) | Config, infrastructure clients, middleware stack, logging, error handling, SSE utilities, Sentry           |

## Quick Orientation

**"How does a scraped course end up in MySQL?"**
→ [api/JOBS.md — ScraperResponseInSISCourseJob](api/JOBS.md#scraperresponseinsisscoursejob)

**"How does the POST /courses filter work?"**
→ [api/SERVICES.md — CourseService](api/SERVICES.md#courseservice)

**"How does the 3 AM cron trigger the scraper?"**
→ [api/JOBS.md — Scheduler](api/JOBS.md#scheduler-production-only)

**"How does SSE notify the client when a scrape finishes?"**
→ [api/ENDPOINTS.md — GET /courses/:id/scrape/status](api/ENDPOINTS.md#get-coursesidscrape-status)

**"How does the Redis response cache work?"**
→ [api/INTERNALS.md — CacheMiddleware](api/INTERNALS.md#cachemiddleware-middlewarescachemiddlewarets)

**"What env vars does the API need?"**
→ [api/INTERNALS.md — Configuration](api/INTERNALS.md#configuration-configconfigts)

**"How do I add a new endpoint?"**
→ [api/README.md — Key Conventions](api/README.md#key-conventions) + [api/ENDPOINTS.md — Controller Convention](api/ENDPOINTS.md#controller-convention)

**"How do I add a new migration?"**
→ [api/DATABASE.md — Migrations](api/DATABASE.md#migrations)
