import Config from '@api/Config/Config'
import Redis from 'ioredis'

/**
 * Redis client instance.
 * Configured with `maxRetriesPerRequest: null` to adhere to BullMQ requirements.
 */
export const redis = new Redis(Config.redis.uri, {
	password: Config.redis.password,
	maxRetriesPerRequest: null
})

/**
 * Creates a dedicated Redis subscriber connection for pub/sub.
 * Returns a duplicate of the main Redis connection.
 */
export function createRedisSubscriber(): Redis {
	return redis.duplicate()
}
