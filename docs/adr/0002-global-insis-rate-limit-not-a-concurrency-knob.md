---
status: accepted
date: 2026-09-12
---

# InSIS load is bounded by one global rate limit, not by a SCRAPER_CONCURRENCY env var

The sibling project Ohlídáme exposes a single `SCRAPER_CONCURRENCY` env var that sets BullMQ worker
concurrency, and it is tempting to copy it here. We deliberately did not. Ohlídáme's parallelism is flat, so one
knob has one meaning. Kreditožrouti's is nested and multiplicative: prod runs `replicas: 2`
(`deployment/production/docker-compose.production.yml`), each worker takes `concurrency: 1`
(`scraper/src/bullmq.ts`), and each job then fans out internally via `runWithConcurrency` at 4 faculties
(`ScraperRequestInSISAcademicSchedulesJob.ts`), 4 catalog combinations (`ScraperRequestInSISCatalogJob.ts`),
6 BFS levels (`ScraperRequestInSISStudyPlansJob.ts`) and 20 on enqueue (`QueueService.ts`). Peak concurrent
requests at InSIS is the product of those layers, not any one of them. A `SCRAPER_CONCURRENCY` knob would sit
at the top of that product, so setting it to the apparently-harmless value of 2 doubles the load on a
university system we do not own, from a single IP, while appearing to do something modest.

Instead, the InSIS HTTP client enforces one Redis-backed requests-per-second ceiling. Because the counter is in
Redis, the ceiling holds across replicas, across worker concurrency, and across every job type, so it cannot be
defeated by scaling the service or by a future job that adds another fan-out layer.

## Consequences

The inner `runWithConcurrency` constants stop being safety-critical and become pure throughput tuning. That is
the point: the number that matters to the third party is now bounded in exactly one place, and the numbers that
matter only to us can be changed without thinking about InSIS.

Do not add a `SCRAPER_CONCURRENCY` env var later for parity with Ohlídáme. It would reintroduce the multiplier
this decision removed.
