import Config from '@scraper/Config/Config'
import Redis from 'ioredis'

/**
 * The Redis client instance used by the scraper service.
 * Configured with `maxRetriesPerRequest: null` to meet BullMQ requirements.
 */
const redis = new Redis(Config.redis.uri, {
    password: Config.redis.password,
    maxRetriesPerRequest: null
})

export { redis }
