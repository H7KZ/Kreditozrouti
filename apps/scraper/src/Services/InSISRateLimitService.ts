import { redis } from '@scraper/clients'
import Config from '@scraper/Config/Config'
import { InSISRateLimitWaitError } from '@scraper/Errors/InSISErrors'
import { logger } from '@scraper/logger'

/**
 * Global outbound rate limit for InSIS.
 *
 * Parallelism in this service is nested and multiplicative: prod runs 2 replicas, each worker
 * takes concurrency 1, and each job then fans out internally (4 faculties, 4 catalog combos,
 * 6 BFS levels, 20 on enqueue). The number that matters to InSIS is the product of those layers,
 * so it is bounded here instead: one Redis-backed token bucket that every outbound request passes
 * through. Because the bucket lives in Redis it holds across replicas, across worker concurrency
 * and across every job type, and it cannot be defeated by scaling the service or by a future job
 * that adds another fan-out layer.
 *
 * See docs/adr/0002-global-insis-rate-limit-not-a-concurrency-knob.md.
 */

/** Single bucket shared by every scraper replica. One process, one job type, one key. */
const BUCKET_KEY = 'scraper:insis:rate_limit'

/** Cost of one outbound request in tokens. */
const REQUEST_COST = 1

/** Waiting past this fraction of the cap means the limiter is saturated - worth a warn. */
const WARN_WAIT_FRACTION = 0.5

/**
 * Atomic token bucket.
 *
 * Refill, check, reserve and persist happen inside one Lua script, so two replicas racing on the
 * same key are serialised by Redis itself. A read-then-write pair from the client would let both
 * replicas observe the same token and both spend it.
 *
 * The clock comes from Redis TIME, not from the caller, so replicas with skewed clocks still share
 * one timeline.
 *
 * A caller that is granted a delayed slot has already spent its token: the wait is a reservation,
 * not a poll. That keeps each request to exactly one sleep and stops a thundering herd from
 * re-racing on every retry. A caller whose wait would exceed maxWait reserves nothing and is told
 * to give up, so refused callers never consume capacity from callers that will actually wait.
 *
 * Returns the milliseconds to wait before sending (0 = send now), or -1 = refuse.
 */
const ACQUIRE_LUA = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local max_wait = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

local state = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(state[1])
local ts = tonumber(state[2])

if tokens == nil or ts == nil then
	tokens = capacity
	ts = now
end

local elapsed = now - ts
if elapsed < 0 then elapsed = 0 end

tokens = math.min(capacity, tokens + ((elapsed * rate) / 1000))

local wait = 0
local deficit = cost - tokens
if deficit > 0 then
	wait = math.ceil((deficit * 1000) / rate)
end

-- An idle bucket refills to capacity anyway, so letting the key expire loses nothing.
local ttl = math.ceil(((capacity * 1000) / rate) + max_wait + 1000)

-- tostring() is load bearing: Redis truncates a Lua number to an integer when it is passed to a
-- command, which would silently discard the fractional part of the bucket on every write and stop
-- it refilling at sub-token granularity. Write the value as a string and read it back with tonumber.
if wait > max_wait then
	redis.call('HSET', key, 'tokens', tostring(tokens), 'ts', tostring(now))
	redis.call('PEXPIRE', key, ttl)
	return -1
end

redis.call('HSET', key, 'tokens', tostring(tokens - cost), 'ts', tostring(now))
redis.call('PEXPIRE', key, ttl)

return wait
`

/** ioredis attaches commands declared via defineCommand to the instance at runtime. */
type RateLimitedRedis = typeof redis & {
	insisRateLimitAcquire(key: string, rate: string, capacity: string, maxWait: string, cost: string): Promise<number>
}

const client = redis as RateLimitedRedis

client.defineCommand('insisRateLimitAcquire', { numberOfKeys: 1, lua: ACQUIRE_LUA })

function delay(ms: number): Promise<void> {
	return new Promise<void>(resolve => {
		setTimeout(resolve, ms)
	})
}

/**
 * Waits until this process is allowed to send one request to InSIS.
 *
 * Resolves when the request may be sent - immediately if the bucket has a token, after a real
 * async delay otherwise. Throws InSISRateLimitWaitError if a token would not arrive within the
 * configured cap, or if the limiter cannot be consulted at all.
 *
 * Callers say only "let me make a request"; the bucket, the Redis key and the Lua script stay in
 * here. The single call site is the axios request interceptor in InSISHTTPClientService.
 */
export async function acquireInSISRequestSlot(): Promise<void> {
	const { requestsPerSecond, burst, maxWaitMs } = Config.insis.rateLimit

	let waitMs: number

	try {
		waitMs = await client.insisRateLimitAcquire(BUCKET_KEY, String(requestsPerSecond), String(burst), String(maxWaitMs), String(REQUEST_COST))
	} catch (error) {
		// Fail closed. The ceiling exists to protect a third-party system we do not own, and a
		// limiter we cannot consult is a limiter that is not protecting anything - so an
		// unreachable Redis stops requests rather than silently reverting to the unpaced
		// behaviour this module was added to remove. The cost is near zero in practice: the
		// scraper takes its jobs from BullMQ, which is the same Redis, so a Redis outage already
		// means no jobs are running. ioredis is configured with maxRetriesPerRequest: null and an
		// offline queue, so a brief blip simply makes this call wait instead of throwing; only a
		// genuine failure reaches here.
		logger.error({ err: error }, 'scraper.insis_rate_limit_unavailable')

		throw new InSISRateLimitWaitError('limiter_unavailable', 'InSIS rate limiter is unavailable - refusing to send an unpaced request')
	}

	if (waitMs < 0) {
		throw new InSISRateLimitWaitError('wait_cap_exceeded', `InSIS rate limit: no slot available within ${maxWaitMs}ms at ${requestsPerSecond} rps`)
	}

	if (waitMs === 0) return

	// Never log per-request at info: the catalog job makes thousands of requests.
	if (waitMs >= maxWaitMs * WARN_WAIT_FRACTION) {
		logger.warn({ wait_ms: waitMs, max_wait_ms: maxWaitMs, rps: requestsPerSecond }, 'scraper.insis_rate_limit_long_wait')
	} else {
		logger.debug({ wait_ms: waitMs, rps: requestsPerSecond }, 'scraper.insis_rate_limit_delayed')
	}

	await delay(waitMs)
}
