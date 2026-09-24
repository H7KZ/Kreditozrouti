# API internals

## Configuration

`apps/api/src/Config/Config.ts` reads the root or package `.env`. Common settings are `API_PORT` (default 40080), `API_ALLOWED_ORIGINS`, `API_COMMAND_TOKEN`, `API_SESSION_SECRET`, `MYSQL_URI`, and `REDIS_URI`. Production requires `API_SESSION_SECRET`; local runs get an ephemeral secret. `API_CACHE_DISABLED=true` bypasses the response cache. Email also needs `GOOGLE_USER` and `GOOGLE_APP_PASSWORD`.

## Requests

`apps/api/src/app.ts` installs CORS, Helmet, Redis-backed sessions, compression, logging, response timing, and metrics before mounting routes. JSON body parsing is route-specific. Controllers validate with co-located Zod schemas; `ErrorHandler` formats `ApiError` responses.

`withCache(300)` wraps the course and plan search routes. Its Redis key hashes method, path, and a recursively sorted JSON body. Redis cache failures leave the route usable.

The public course-refresh limiter permits 3 requests per IP and 1 per course per 10 minutes. Optimization permits 50 per IP per 10 minutes. Share and iCal creation each permit 10 per IP per minute. Operator routes check `API_COMMAND_TOKEN`.

## Observability

`apps/api/src/logger.ts` and request/job contexts emit structured Pino events. `apps/api/src/metrics.ts` exposes request duration, queue counts, worker activity, build information, and Node metrics at `GET /metrics`. Requests with proxy headers receive 404 on that endpoint.

`apps/api/src/Utils/Sse.ts` implements the course-refresh event stream. `apps/api/src/Utils/TimeConflict.ts` builds Kysely time-overlap predicates. Pure time comparison and conversion helpers live in `@kreditozrouti/core/domain`.
