import type { UsageCounterStore, UsageCounts } from '@kreditozrouti/core/partner-api'
import { redis } from '@api/clients'

const HOURS_KEY = 'usage:hours'
const countsKey = (hour: string) => `usage:count:${hour}`
const durationKey = (hour: string) => `usage:ms:${hour}`

// Safety net: an hour that is never flushed (flush job down) still disappears after 3 days.
const SAFETY_TTL_SECONDS = 3 * 86_400

export const RedisUsageCounterStore: UsageCounterStore = {
	async record(hour, field, durationMs) {
		await redis
			.multi()
			.hincrby(countsKey(hour), field, 1)
			.hincrby(durationKey(hour), field, Math.round(durationMs))
			.expire(countsKey(hour), SAFETY_TTL_SECONDS)
			.expire(durationKey(hour), SAFETY_TTL_SECONDS)
			.sadd(HOURS_KEY, hour)
			.exec()
	},

	listHours() {
		return redis.smembers(HOURS_KEY)
	},

	async readHour(hour) {
		const [counts, durations] = await Promise.all([redis.hgetall(countsKey(hour)), redis.hgetall(durationKey(hour))])

		const result: Record<string, UsageCounts> = {}
		for (const [field, count] of Object.entries(counts)) {
			result[field] = { count: Number(count), durationMs: Number(durations[field] ?? 0) }
		}
		return result
	},

	async dropHour(hour) {
		await redis.multi().del(countsKey(hour)).del(durationKey(hour)).srem(HOURS_KEY, hour).exec()
	}
}
