import type { QuotaStore } from '@kreditozrouti/core/partner-api'
import { redis } from '@api/clients'
import { guardedRedis } from './redisGuard'

/**
 * INCR and the first-use EXPIRE run in one Lua script, so a crash between them can never leave a counter
 * without a TTL. A counter that lost its TTL anyway is repaired on the next hit.
 */
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if count == 1 or ttl < 0 then
	redis.call('EXPIRE', KEYS[1], ARGV[1])
	ttl = tonumber(ARGV[1])
end
return {count, ttl}
`

export const RedisQuotaStore: QuotaStore = {
	async hit(key, ttlSeconds) {
		const [count, ttl] = (await guardedRedis(() => redis.eval(HIT_SCRIPT, 1, key, ttlSeconds))) as [number, number]
		return { count, ttlSeconds: ttl }
	},

	async peek(key) {
		return Number((await guardedRedis(() => redis.get(key))) ?? 0)
	}
}
