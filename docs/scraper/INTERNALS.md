# Scraper internals

## Startup and configuration

`apps/scraper/src/index.ts` starts worker processes. `apps/scraper/src/bullmq.ts` connects the request worker and response producer. `apps/scraper/src/Config/Config.ts` reads the root or package `.env`; InSIS URLs are code defaults. Key settings are `REDIS_URI`, optional `REDIS_PASSWORD`, `ENV`, and the `INSIS_RATE_LIMIT_*` values described in [queue behavior](QUEUE.md#insis-rate-limit).

## HTTP and extraction helpers

`InSISHTTPClientService` wraps Axios GET/POST calls, standard headers, error metadata, and network retries. Every outbound attempt acquires a Redis rate-limit slot in a request interceptor. `InSISRateLimitService` uses one atomic Redis Lua token bucket across replicas; it refuses requests when the wait cap or Redis availability prevents safe pacing.

`HTMLUtils.ts` centralizes Cheerio cleanup. `HTTPUtils.ts` builds InSIS request headers. `ConcurrencyUtils.ts` bounds fan-out inside discovery jobs. These concurrency settings improve throughput; the Redis token bucket controls total outbound rate.

## Errors and observability

`InSISErrors.ts` defines network, parse, upstream 429, and local rate-limit-wait errors. `ScraperRequestHandler` records job-wide Pino events through `LoggerJobContext`, rethrows retryable failures, and delays upstream 429s. Individual jobs may log and return `null` for best-effort work.

Each replica serves `/metrics` on `SCRAPER_METRICS_PORT` (default 9101), including worker and silent-failure metrics. Keep one worker process per container when using that port.
