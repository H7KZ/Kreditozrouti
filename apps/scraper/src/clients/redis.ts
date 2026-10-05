import Redis from 'ioredis'
import Config from '@scraper/Config/Config'

/**
 * The Redis client instance used by the scraper service.
 * Configured with `maxRetriesPerRequest: null` to meet BullMQ requirements.
 */
const redis = new Redis(Config.redis.uri, {
	password: Config.redis.password,
	maxRetriesPerRequest: null
})

export { redis }
