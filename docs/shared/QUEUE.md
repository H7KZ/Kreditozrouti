# Shared queue contracts

The API sends scrape requests to the scraper through BullMQ. The scraper sends results back to the API; only the API writes them to MySQL.

| Contract | Source |
|----------|--------|
| Queue and scheduler names | [`packages/core/src/queue/names.ts`](../../packages/core/src/queue/names.ts) |
| Scraped data and request/response job payloads | [`packages/types/src/queue.ts`](../../packages/types/src/queue.ts) |

Use `ScraperRequestJob` and `ScraperResponseJob` from `@kreditozrouti/types` for payloads. Use `ScraperRequestQueue` and `ScraperResponseQueue` from `@kreditozrouti/core/queue` for names. See the [scraper queue guide](../scraper/QUEUE.md) for retry and routing behavior.
