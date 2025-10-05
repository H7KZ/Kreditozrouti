import Config from '@scraper/Config/Config'
import Redis from 'ioredis'

const redis = new Redis(Config.redis.uri, {
    password: Config.redis.password,
    maxRetriesPerRequest: null
})

export { redis }
