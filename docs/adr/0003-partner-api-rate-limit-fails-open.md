---
status: accepted
date: 2026-10-05
---

# The partner API rate limit fails open when Redis is unavailable

The scraper's InSIS limiter fails closed ([ADR 0002](0002-global-insis-rate-limit-not-a-concurrency-knob.md)):
if Redis cannot be consulted, the request is refused. The public API limiter does the opposite. If Redis cannot
be consulted, the request is served, the failure is logged loudly, and quotas are briefly unenforced.

The two limiters protect different things. The InSIS limiter protects a university system we do not own, from a
single IP, and an unpaced burst there is harm we cannot undo. The partner API limiter protects our own MySQL from
a partner's client loop, and quotas are per Consumer, so the exposure is one known partner, not the open internet.
Failing closed would turn a Redis blip, where Redis is only a cache and counter store for us, into an outage of
the partner's UI. Failing open costs a short window of unenforced quota, which the daily cap and the hourly usage
aggregates catch afterwards.

## Considered options

- Fail closed everywhere, for consistency with ADR 0002. Rejected: consistency is not worth a partner outage when
  the thing protected is our own database.
- Fail open with an in-process fallback limiter. Deferred: adds a second implementation for a window that is
  seconds long, and the in-memory store is not shared across replicas (the MCP server already shows that gap).

## Consequences

The rate-limit module takes an injected store port and treats a store error as "allow, and record the error". A
Redis outage must be visible in logs and metrics, because nothing else will show that quotas were not enforced.
Do not copy this behaviour to any limiter that guards a system we do not own.

Failing open has to be implemented, not assumed. The API's shared Redis client uses `maxRetriesPerRequest: null` (BullMQ requires it), so during an outage it queues commands and retries forever, and a plain `await` in the quota check hangs the request. A drill against a stopped Redis caught this. Every Redis call on the partner request path therefore goes through `guardedRedis` (`apps/api/src/Services/Partner/redisGuard.ts`): it rejects at once when the connection is not ready and after 300 ms when it is slow, and usage counts are dropped rather than queued during the outage.
