import { redis } from '@api/clients'

/** Longest a partner request waits on Redis before the quota check gives up and fails open (ADR 0003). */
const REDIS_TIMEOUT_MS = 300

/**
 * Runs a Redis operation for the partner API hot path without ever blocking the request on Redis.
 *
 * The shared client uses `maxRetriesPerRequest: null` (BullMQ requires it), so while Redis is down it queues
 * commands and retries forever: a plain `await redis.eval(...)` would hang the request instead of failing.
 * This rejects immediately when the connection is not ready (so nothing piles up in the offline queue) and
 * after a short timeout when it is ready but slow. Callers treat the rejection as "store unavailable".
 */
export async function guardedRedis<T>(operation: () => Promise<T>): Promise<T> {
	if (redis.status !== 'ready') throw new Error(`redis is ${redis.status}`)

	let timer: NodeJS.Timeout | undefined
	try {
		return await Promise.race([
			operation(),
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(() => reject(new Error(`redis did not answer within ${REDIS_TIMEOUT_MS} ms`)), REDIS_TIMEOUT_MS)
			})
		])
	} finally {
		clearTimeout(timer)
	}
}
