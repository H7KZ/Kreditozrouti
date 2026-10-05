/**
 * Counter store behind the quota check. The adapter (Redis in apps/api) must make `hit` atomic, because
 * a separate INCR and EXPIRE can leave a counter without a TTL.
 */
export interface QuotaStore {
	/** Increments the counter, sets its TTL on first use and returns the new count and the remaining TTL. */
	hit(key: string, ttlSeconds: number): Promise<{ count: number; ttlSeconds: number }>
	/** Reads a counter without incrementing it. Returns 0 when the counter does not exist. */
	peek(key: string): Promise<number>
}

export interface QuotaPolicy {
	requestsPerMinute: number
	requestsPerDay: number
}

export type QuotaWindow = 'minute' | 'day'

export type QuotaDecision =
	| {
			allowed: true
			/** True when the store failed and the request was let through unmetered (fail open, ADR 0003). */
			degraded: boolean
			window: QuotaWindow
			limit: number
			remaining: number
			resetSeconds: number
	  }
	| {
			allowed: false
			window: QuotaWindow
			limit: number
			retryAfterSeconds: number
	  }

const MINUTE_SECONDS = 60
const DAY_SECONDS = 86_400

/** Counter key for a window. UTC buckets, so every replica agrees on the boundary. */
export function quotaKey(consumerId: number, window: QuotaWindow, now: Date): string {
	const seconds = Math.floor(now.getTime() / 1000)
	const bucket = Math.floor(seconds / (window === 'minute' ? MINUTE_SECONDS : DAY_SECONDS))

	return `quota:${consumerId}:${window === 'minute' ? 'm' : 'd'}:${bucket}`
}

/** Seconds until the current UTC day ends. */
export function secondsUntilUtcMidnight(now: Date): number {
	return DAY_SECONDS - (Math.floor(now.getTime() / 1000) % DAY_SECONDS)
}

/**
 * Counts one request against the consumer's plan: the per-minute burst limit first, then the daily cap.
 *
 * Quota belongs to the consumer, not the key, so issuing more keys never multiplies it. A store failure
 * does not block the request: it is reported through `onStoreError` and the request is allowed with
 * `degraded: true`. This is the opposite of the InSIS limiter on purpose, see ADR 0003.
 */
export async function checkQuota(
	store: QuotaStore,
	consumerId: number,
	policy: QuotaPolicy,
	now: Date = new Date(),
	onStoreError?: (error: unknown) => void
): Promise<QuotaDecision> {
	try {
		const minute = await store.hit(quotaKey(consumerId, 'minute', now), MINUTE_SECONDS)
		if (minute.count > policy.requestsPerMinute) {
			return { allowed: false, window: 'minute', limit: policy.requestsPerMinute, retryAfterSeconds: Math.max(1, minute.ttlSeconds) }
		}

		const day = await store.hit(quotaKey(consumerId, 'day', now), DAY_SECONDS)
		if (day.count > policy.requestsPerDay) {
			return { allowed: false, window: 'day', limit: policy.requestsPerDay, retryAfterSeconds: Math.max(1, day.ttlSeconds) }
		}

		const minuteRemaining = policy.requestsPerMinute - minute.count
		const dayRemaining = policy.requestsPerDay - day.count

		// Report the window that will run out first, so the headers show the binding constraint.
		return dayRemaining <= minuteRemaining
			? {
					allowed: true,
					degraded: false,
					window: 'day',
					limit: policy.requestsPerDay,
					remaining: dayRemaining,
					resetSeconds: Math.max(1, day.ttlSeconds)
				}
			: {
					allowed: true,
					degraded: false,
					window: 'minute',
					limit: policy.requestsPerMinute,
					remaining: minuteRemaining,
					resetSeconds: Math.max(1, minute.ttlSeconds)
				}
	} catch (error) {
		onStoreError?.(error)

		return {
			allowed: true,
			degraded: true,
			window: 'minute',
			limit: policy.requestsPerMinute,
			remaining: policy.requestsPerMinute,
			resetSeconds: MINUTE_SECONDS
		}
	}
}

/** Requests used and left today, for `GET /v1/usage`. Returns nulls when the store is unavailable. */
export async function peekDailyUsage(
	store: QuotaStore,
	consumerId: number,
	policy: QuotaPolicy,
	now: Date = new Date()
): Promise<{ used: number | null; remaining: number | null }> {
	try {
		const used = await store.peek(quotaKey(consumerId, 'day', now))
		return { used, remaining: Math.max(0, policy.requestsPerDay - used) }
	} catch {
		return { used: null, remaining: null }
	}
}
