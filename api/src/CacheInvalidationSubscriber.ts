import Redis from 'ioredis'
import { redis } from '@api/clients'
import Config from '@api/Config/Config'
import LoggerJobContext from '@api/Context/LoggerJobContext'

const redisSubscriber = new Redis(Config.redis.uri, {
	password: Config.redis.password,
	maxRetriesPerRequest: null
})

async function flushCaches(): Promise<void> {
	for (const pattern of ['cache:*', 'course:facets:*']) {
		let cursor = '0'
		do {
			const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
			cursor = nextCursor
			if (keys.length > 0) await redis.del(...keys)
		} while (cursor !== '0')
	}
}

export async function initCacheInvalidationSubscriber(): Promise<void> {
	redisSubscriber.on('pmessage', async (_pattern: string, channel: string) => {
		await flushCaches()
		LoggerJobContext.log.info({ channel }, 'cache.invalidated_by_pubsub')
	})

	await redisSubscriber.psubscribe('course:updated:*')
}

export async function closeCacheInvalidationSubscriber(): Promise<void> {
	await redisSubscriber.punsubscribe('course:updated:*')
	redisSubscriber.disconnect()
}
