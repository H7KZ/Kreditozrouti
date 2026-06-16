# API — Internals

Infrastructure, middleware, logging, error handling, SSE, rate limiting, and configuration.

---

## Configuration (`Config/Config.ts`)

A single module-level object exported as `config`. Populated from environment variables at import time.

```typescript
import config from '@api/Config/Config'

config.env               // 'local' | 'development' | 'production'
config.port              // default 40080
config.uri               // full API public URI
config.domain            // top-level domain for cookie scoping
config.allowedOrigins    // string[] from API_ALLOWED_ORIGINS (comma-split)
config.sessionSecret     // API_SESSION_SECRET
config.commandToken      // API_COMMAND_TOKEN (Bearer token for /commands)
config.redis.uri         // REDIS_URI
config.mysql.uri         // MYSQL_URI
config.client.uri        // CLIENT_URI
config.client.createURL  // (path: string) => full client URL

config.isEnvProduction() // env === 'production' || 'prod'
config.isEnvDevelopment()
config.isEnvLocal()
config.isEmailEnabled()  // true if GOOGLE_USER + GOOGLE_APP_PASSWORD are set
config.cacheDisabled     // true if API_CACHE_DISABLED=true
```

**Validation:** `CheckRequiredEnvironmentVariables(config)` throws on startup if `REDIS_URI` or `MYSQL_URI` is missing.

**`.env` loading:** `LoadConfig()` tries `../../../../.env`, `../.env`, then `./.env` — works from both the built`dist/`
and the source root.

---

## Infrastructure Clients (`clients/`)

All clients are module-level singletons, initialized once and shared across the process.

### MySQL (`clients/mysql.ts`)

Kysely instance backed by `mysql2` connection pool. Features:

- **Slow query logging:** queries > 1000ms are logged with duration

### Redis (`clients/redis.ts`)

Two exports:

```typescript
import {redis, createRedisSubscriber} from '@api/clients'

redis                         // shared ioredis instance for all read/write ops
createRedisSubscriber()       // creates a fresh ioredis connection for pub/sub
```

A separate subscriber connection is required because a subscribed ioredis client cannot issue regular commands.
`CourseScraperController.status` calls `createRedisSubscriber()` for each SSE connection.

### Nodemailer (`clients/mailer.ts`)

Gmail transporter using OAuth/app passwords. Only used when `Config.isEmailEnabled()` is true. The SMTP connection is
verified on startup.

---

## Middleware

### CacheMiddleware (`Middlewares/CacheMiddleware.ts`)

```typescript
withCache(ttl
:
number
):
RequestHandler
```

Wraps a route with Redis response caching.

**Cache key:** SHA-256 of `"METHOD:path:" + JSON.stringify(sortedBody)` — sorting ensures `{"a":1,"b":2}` and
`{"b":2,"a":1}` produce the same key. Prefixed with `cache:`.

**How it works:**

1. Check Redis for `cache:{hash}`
2. On hit → return cached JSON immediately
3. On miss → intercept `res.json()`, store response in Redis with TTL, then proceed normally
4. Redis errors are silently swallowed — the route still works without cache

**Disabling cache:** set `API_CACHE_DISABLED=true` in `.env` to bypass caching entirely (useful on localhost to always
see live data).

**Cache invalidation:** `ScraperResponseInSISCourseJob` flushes all `cache:*` keys after a successful course sync using
`SCAN` + `DEL`.

### RateLimitMiddleware (`Middlewares/RateLimitMiddleware.ts`)

```typescript
scraperRateLimit()
:
RequestHandler[]
```

Returns two middleware functions (applied together on scrape routes):

| Limiter        | Key           | Limit    | Window     |
|----------------|---------------|----------|------------|
| IP limiter     | `req.ip`      | 3 points | 10 minutes |
| Course limiter | `course:{id}` | 1 point  | 10 minutes |

Both use `rate-limiter-flexible` with Redis as the backend. Both are consumed in parallel per request — a request must
pass both checks.

On limit exceeded, returns `429 Too Many Requests` with a `Retry-After` header.

### CommandMiddleware (`Middlewares/CommandMiddleware.ts`)

Validates `Authorization: Bearer <token>` header against `Config.commandToken`. Throws `Errors.unauthorized()` if
missing or wrong. Applied only to `/commands/*` routes.

### LoggerMiddleware (`Middlewares/LoggerMiddleware.ts`)

Sets up a **wide-event** per request: a single JSON object that accumulates fields throughout the request lifecycle and
is emitted as one Pino log line at the end. Also wraps the entire downstream request handler in an `AsyncLocalStorage`
context so that async code can access the `request_id` and other fields via `RequestContext.get()`.

**Workflow:**

1. Generate a unique `request_id` (UUID) per request
2. Create the initial `wideEvent` and store it in `res.locals.wideEvent`
3. Set the `X-Request-Id` response header
4. Wrap the entire request handler (`next()`) in `RequestContext.run()` so async code in controllers/services can access
   the context
5. On response `finish`:
    - Merge any fields controllers added via `LoggerAPIContext.add()` (which delegates to `RequestContext.add()`)
    - Emit the accumulated event as a Pino log line via `LoggerAPIContext.log`
    - Track error metrics in Redis (hourly bucket + recent error list)

```typescript
res.locals.wideEvent = {
    request_id: '...',  // UUID
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
    environment: config.env,
    service: 'kreditozrouti-api',
    duration_ms? : number,     // set on finish
    status_code? : number,     // set on finish
    user_id? : number,         // set by controllers via LoggerAPIContext.add()
    // ... other fields controllers add
}
```

Log emission uses **level-based routing** (replaces the old `shouldLog` probability sampling):

| Condition         | Level   | Rationale                       |
|-------------------|---------|---------------------------------|
| status ≥ 500      | `error` | Server error — always emitted   |
| status 4xx        | `warn`  | Client error — always emitted   |
| duration > 1000ms | `info`  | Slow request — always emitted   |
| otherwise         | `debug` | Routine — dropped in production |

`LoggerAPIContext.log` is a Pino child logger (`logger.child({ context: 'http' })`) derived from the root logger in
`api/src/logger.ts` (which binds `service: 'api'` and `env`).

### ParserMiddleware (`Middlewares/ParserMiddleware.ts`)

Registers `body-parser` for JSON, raw, and urlencoded bodies.

---

## Error Handling

### `ApiError` class (`Errors/index.ts`)

```typescript
class ApiError extends Error {
    status: number    // HTTP status code
    type: string      // Error type constant
    details?: Record<string, unknown>
}
```

### `Errors` factory

```typescript
Errors.unauthorized(msg ?)   // → 401 UNAUTHORIZED
Errors.validation(issues, msg ?) // → 403 VALIDATION + { issues: ZodIssue[] }
Errors.notFound(msg ?)       // → 404 NOT_FOUND
Errors.internal(msg ?)       // → 500 INTERNAL
```

Throw anywhere — the global `ErrorHandler` middleware catches all `ApiError` instances and formats the response:

```json
{
  "type": "VALIDATION",
  "message": "Validation failed",
  "details": {
    "issues": [
      ...
    ]
  }
}
```

Non-`ApiError` exceptions produce a generic `500 INTERNAL` response and are `console.error`'d.

---

## Wide-Event Logging

`LoggerAPIContext` delegates to `RequestContext`, which is AsyncLocalStorage-based. The request handler is wrapped in
`RequestContext.run()` so that all async code (controllers, services, etc.) can access the context. Fields are added
via `LoggerAPIContext.add()`, which delegates to `RequestContext.add()`.

```typescript
// In any controller/service/middleware:
LoggerAPIContext.add({user_id: 42, cache_hit: true})

// LoggerAPIContext.add() delegates to:
RequestContext.add({user_id: 42, cache_hit: true})

// At response end, LoggerMiddleware:
// 1. Merges all fields from the async context:
Object.assign(wideEvent, RequestContext.get())

// 2. Emits at the appropriate level:
LoggerAPIContext.log.error(wideEvent)  // status ≥ 500
LoggerAPIContext.log.warn(wideEvent)   // status 4xx
LoggerAPIContext.log.info(wideEvent)   // duration > 1000ms
LoggerAPIContext.log.debug(wideEvent)  // routine (dropped in prod)
```

Fields added via `LoggerAPIContext.add()` are stored in the `AsyncLocalStorage` and merged into the event on finish
(last write wins for duplicate keys).

### Root logger (`api/src/logger.ts`)

The root pino logger is created once and shared across the process:

```typescript
import logger from '@api/logger'

// Root logger — binds service: 'api' and env on every line
logger.info({msg: 'startup'})

// Context loggers are child loggers derived from root:
// LoggerAPIContext.log  = logger.child({ context: 'http' })
// LoggerJobContext.log  = logger.child({ context: 'job' })
```

`withJobLogger` (exported from `api/src/logger.ts`) wraps BullMQ worker processors — it creates the job-scoped
AsyncLocalStorage context and emits the wide-event on completion, equivalent to what `ScraperRequestHandler` does in
the scraper.

---

## SSE Utilities (`utils/sse.ts`)

```typescript
initSSE(res)
// Sets Content-Type: text/event-stream, Cache-Control: no-cache,
// Connection: keep-alive, X-Accel-Buffering: no
// Calls res.flushHeaders() to begin the stream immediately

sendSSEEvent(res, event, data)
// Writes: "event: {event}\ndata: {JSON.stringify(data)}\n\n"

startSSEHeartbeat(res, intervalMs = 30_000)
// Writes ": heartbeat\n\n" every intervalMs ms
// Returns NodeJS.Timeout (clear it on disconnect/timeout)

closeSSE(res)
// Calls res.end()
```

**Why `X-Accel-Buffering: no`:** Nginx buffers responses by default; this header disables buffering for SSE connections
so events are delivered immediately through the proxy.

---

## Time Conflict Utilities (`utils/timeConflict.ts`)

### `buildSlotConflictConditions(eb, exc, slotAlias)`

Builds Kysely expression conditions for detecting whether a slot conflicts with a time exclusion.

A conflict occurs when **any** of:

1. `slot.day === exc.day` AND time ranges overlap
2. `slot.date === exc.date` AND time ranges overlap
3. `slot.day === dayOfWeek(exc.date)` AND time ranges overlap (catches weekly recurring slots on an excluded date)

Optionally skips a specific `slot_id` if `exc.slot_id` is set (so the user's already-selected slot isn't counted as a
conflict with itself).

Returns an array of Kysely expressions — combine with `.or()` in the parent query.

### `compareTimeSelections`

Re-exported from `@shared/domain/timetable`. Used by the client to sort or compare time selection objects.

---

## Logging Infrastructure

All logging is handled by **Pino** via the root logger at `api/src/logger.ts`.

- **Root logger** — binds `service: 'api'` and `env` on every line; level defaults to `debug` locally, `info` in
  production.
- **HTTP logging** — `LoggerAPIContext.log` (child `{ context: 'http' }`), emitted by `LoggerMiddleware` using
  level-based routing (see above).
- **Job logging** — `LoggerJobContext.log` (child `{ context: 'job' }`), wrapped by `withJobLogger` for BullMQ workers.
- **Structured JSON** — output goes to stdout; Alloy reads Docker stdout and ships to Loki.

