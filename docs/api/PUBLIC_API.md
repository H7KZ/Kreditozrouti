# Partner API (`/v1`)

A read-only course catalogue for approved partners, first Studolog. It can be called from a partner's backend or straight from its frontend with the same keys (see [browser use](#browser-use)). Why it is partner-only and gated is in [ADR 0004](../adr/0004-public-api-is-partner-only-behind-hard-gates.md); why browsers are bound to per-key origins is in [ADR 0005](../adr/0005-browser-origins-are-bound-per-api-key.md); why its limiter fails open is in [ADR 0003](../adr/0003-partner-api-rate-limit-fails-open.md). Terms (Consumer, API Key, Plan, Lecturer) are in the [glossary](../DOMAIN.md).

The machine-readable contract is `GET /v1/openapi.json` (OpenAPI 3.1, no key needed). Query parameters in it are generated from the same Zod schemas the handlers validate with ([`schemas.ts`](../../apps/api/src/Controllers/V1/schemas.ts)). Public response shapes are in [`packages/types/src/publicApi.ts`](../../packages/types/src/publicApi.ts).

## Auth, scopes, quota

Send `Authorization: Bearer kz_live_...`. A missing, malformed, unknown, revoked or expired key, or a disabled Consumer, all answer the same 401 with `WWW-Authenticate: Bearer`. The reason is logged as `partner_auth_failure`, never returned.

| Scope            | Grants                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `catalogue:read` | Courses, faculties, periods, study plans                                                                               |
| `lecturers:read` | `/lecturers`, the `lecturer_id` filter, and the `lecturers` and unit `lecturer` fields on courses (omitted without it) |
| `usage:read`     | `GET /v1/usage`                                                                                                        |

Quota belongs to the Consumer, not the key, so extra keys never add quota. A Plan sets a per-minute burst limit and a daily cap (UTC buckets). Responses carry `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` for the window that will run out first. These follow an IETF Internet-Draft, so treat them as optional. A 429 always carries `Retry-After` and a problem document with `window` (`minute` or `day`). If Redis is unavailable the request is let through unmetered (immediately when the connection is not ready, and after 300 ms when it is slow; the shared client retries forever, so every partner Redis call goes through `guardedRedis`), `api_quota_store_errors_total` increases and the wide event gets `quota_degraded: true`.

The seeded `partner` Plan is 300 requests per minute and 50,000 per day. It is a starting guess: tune it from `api_usage_hourly`.

## Browser use

A key may carry **allowed origins**, set by the operator (`partnerKeys create-key --origins ...` or `set-origins`). Exact origins only (`https://studolog.cz`, `http://localhost:5173` for development), no wildcards, no path.

| Caller | Result |
| --- | --- |
| No `Origin` header (server, curl) | Works with any key |
| Browser, origin listed on the key | Works; the response carries `Access-Control-Allow-Origin` and exposes `RateLimit-*`, `Retry-After`, `X-Request-Id` |
| Browser, origin not listed on this key | 403 problem document |
| Browser, key has no origins | 403 "not enabled for browser use" |

The CORS preflight carries no key, so it is answered for every origin registered on some usable key (cached 15 seconds) and for no other origin. CORS headers are sent on errors too (401, 403, 429), so a frontend can read them. Only `GET` and `OPTIONS` are allowed, and credentials are never allowed: send the key in `Authorization: Bearer`, not in a cookie.

A key with origins is **public by nature**: anyone can read it from the page, and an origin check does not stop a non-browser client from sending any `Origin`. Its protection is the origin binding against other websites, the per-consumer quota, its scopes, and revocation. Recommended: one key for the backend (no origins) and a separate key for the frontend with origins and only the scopes the frontend needs, for example without `lecturers:read`. Browser and backend traffic spend the same per-consumer quota.

## Endpoints

| Path                                         | Scope            | Notes                                                             |
| -------------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| `GET /v1/courses`                            | `catalogue:read` | Filters below. Returns units and slots.                           |
| `GET /v1/courses/:id`                        | `catalogue:read` | Adds syllabus text, assessments, prerequisite idents              |
| `GET /v1/lecturers`, `/v1/lecturers/:id`     | `lecturers:read` | `id` is the InSIS person id. Detail lists the lecturer's courses. |
| `GET /v1/faculties`, `/v1/periods`           | `catalogue:read` | `periods` filters by `year`, `semester`, `faculty`                |
| `GET /v1/study-plans`, `/v1/study-plans/:id` | `catalogue:read` | Detail lists course idents with group and category                |
| `GET /v1/usage`                              | `usage:read`     | `?days=1..31`. `today.used` is live; `days` is flushed hourly.    |
| `GET /v1/openapi.json`                       | none             | The contract                                                      |

`GET /v1/courses` accepts `year`, `semester` (`ZS`/`LS`), `faculty`, `level`, `language` (comma-separated or repeated), `ects_min`, `ects_max`, `lecturer_id`, `study_plan_id`, `q` (full-text, 2+ characters), `day` with optional `time_from`/`time_to` (`HH:MM`; matches courses with a slot overlapping that window), `sort` (`ident`, `title`, `ects`), `order`, `limit` (1-100, default 20) and `offset`. Unknown parameters are rejected with 422. `level` and `language` use the normalised values the web app uses (`bachelor`, `czech`, ...). There are no facets and no conflict-with-my-selection filter in v1.

Lists return `{ data, meta: { total, limit, offset } }`. Times are `HH:MM`, days are `monday`..`sunday`, lists are arrays. Unit-level lecturers are names only: InSIS publishes no person link for them.

Errors are RFC 9457 `application/problem+json` with `type` (a `urn:kreditozrouti:problem:*` URN), `title`, `status`, `detail`, `instance`, `request_id`, plus `errors` for validation (422) and `window`/`retry_after_seconds` for 429. The problem types are `unauthorized`, `forbidden`, `validation`, `not-found`, `rate-limited` and `internal`.

## What is served

Only faculties whose schedule InSIS publishes publicly **and** that a scrape has confirmed (`insis_faculties.is_schedule_publicly_visible` and `schedule_visibility_checked_at IS NOT NULL`). Until the faculty-timetable job runs after deploy, the API serves nothing. Run it (or wait for the Sunday schedule) before issuing a key. Every endpoint goes through [`VisibilityService`](../../apps/api/src/Services/V1/VisibilityService.ts), including lecturer course lists. The web app is unaffected and still shows every faculty. The visible set is cached for 60 seconds.

Lecturer ids exist only for courses scraped after the lecturer change. Course pages scraped earlier are backfilled on their next scrape, including when their content is unchanged.

## Operating it

Keys are managed with a CLI that talks to MySQL directly, so there is no HTTP surface for minting keys.

```bash
# development
pnpm --filter @kreditozrouti/api partner-keys create-consumer studolog "Studolog" --email team@studolog.com
pnpm --filter @kreditozrouti/api partner-keys create-key studolog --label "production"
pnpm --filter @kreditozrouti/api partner-keys create-key studolog --label "frontend" --scopes catalogue:read --origins https://studolog.cz,https://www.studolog.cz
# production
docker compose exec api node dist/apps/api/src/Scripts/partnerKeys.js list
```

Commands: `create-consumer`, `create-key`, `list`, `set-origins <prefix> <origins|none>`, `revoke <prefix>`, `disable-consumer`, `enable-consumer`, `set-plan`, `create-plan`. A new key is printed once and only its SHA-256 is stored. Revocation, disabling and plan changes reach every replica within 15 seconds (in-process key cache). Keys have a literal `kz_live_` prefix so secret scanners can find a leaked one. Details are in [`partnerKeys.ts`](../../apps/api/src/Scripts/partnerKeys.ts).

## Usage analytics

- Prometheus: `api_consumer_requests_total{consumer,route,status_class}` and `api_quota_store_errors_total`. Alerts `PartnerQuotaStoreUnavailable` and a stale-flush `ScheduledJobStale` are in `deployment/monitoring/prometheus/rules/alerts.yml`. `route` is always a template. The contract metrics in [AGENTS.md](../../apps/api/AGENTS.md) are untouched.
- MySQL: `api_usage_hourly`, one row per consumer, key, hour, route template and status class, with request count and summed latency. Counters live in Redis per hour and an hourly BullMQ job (`partner-usage-flush`, at :05) adds completed hours to MySQL. Bodies, IPs and filter values are never stored. The same job deletes rows older than 13 months (`USAGE_RETENTION_MONTHS`).
- Logs: the wide event gets `consumer`, `consumer_id` and `key_id`.

## Code map

| Concern                                                                        | Where                                                                                                                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Key generation, hashing, bearer parsing; quota check; usage counters and flush | [`packages/core/src/partner-api/`](../../packages/core/src/partner-api/index.ts) behind `QuotaStore`, `UsageCounterStore` and `UsageSink` ports |
| Redis and MySQL adapters, key lookup and cache                                 | `apps/api/src/Services/Partner/`                                                                                                                |
| Auth, origin, scope and quota middleware | `apps/api/src/Middlewares/PartnerAuthMiddleware.ts` |
| CORS and the origin registry | `apps/api/src/Middlewares/PartnerCorsMiddleware.ts`, `apps/api/src/Services/Partner/OriginRegistry.ts`; origin parsing in `@kreditozrouti/core/partner-api` |
| Routes, controllers, OpenAPI                                                   | `apps/api/src/Routes/V1Routes.ts`, `apps/api/src/Controllers/V1/`                                                                               |
| Queries, visibility, DTO mapping                                               | `apps/api/src/Services/V1/`                                                                                                                     |
| Problem+json errors                                                            | `apps/api/src/Handlers/ProblemHandler.ts`                                                                                                       |

## Before the first key

All five gates in ADR 0004 must pass. Items still open: Studolog's written terms, the privacy notice for lecturer names, VŠE/InSIS permission to redistribute, and a fail-open drill (stop Redis, confirm `/v1` still answers and `partner.quota_store_failed` is logged).
