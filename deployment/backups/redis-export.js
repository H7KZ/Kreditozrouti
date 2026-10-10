const Redis = require('ioredis')

const MAX_KEYS = 100_000
const MAX_BYTES = 64 * 1024 * 1024
const KEY_PATTERN = /^(share|ical):[A-Za-z0-9_-]+$/

async function main() {
	const redis = new Redis(process.env.REDIS_URI, {
		password: process.env.REDIS_PASSWORD,
		maxRetriesPerRequest: 3,
		connectTimeout: 10_000,
		commandTimeout: 30_000
	})

	try {
		const entries = new Map()
		let cursor = '0'
		let capturedAtUnixMs = 0
		let totalBytes = 0

		do {
			const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', '*:*', 'COUNT', 500)
			cursor = nextCursor
			const eligibleKeys = keys.filter(key => KEY_PATTERN.test(key))

			for (let offset = 0; offset < eligibleKeys.length; offset += 100) {
				const batch = eligibleKeys.slice(offset, offset + 100)
				const transaction = redis.multi()
				transaction.time()
				for (const key of batch) {
					transaction.get(key)
					transaction.pexpiretime(key)
				}
				const replies = await transaction.exec()
				if (!replies || replies.some(([error]) => error)) throw new Error('Redis batch read failed')

				const [seconds, microseconds] = replies[0][1]
				capturedAtUnixMs = Math.max(capturedAtUnixMs, Number(seconds) * 1000 + Math.floor(Number(microseconds) / 1000))

				for (let index = 0; index < batch.length; index += 1) {
					const value = replies[1 + index * 2][1]
					const expiresAtUnixMs = Number(replies[2 + index * 2][1])
					if (value === null || expiresAtUnixMs === -2) continue
					if (typeof value !== 'string' || !Number.isSafeInteger(expiresAtUnixMs)) {
						throw new Error('Redis key has an unsupported value or expiry')
					}
					if (expiresAtUnixMs === -1) throw new Error('Durable Redis key has no expiry')
					if (expiresAtUnixMs < 0) throw new Error('Redis key has an unsupported expiry')
					totalBytes += Buffer.byteLength(batch[index]) + Buffer.byteLength(value)
					if (totalBytes > MAX_BYTES) throw new Error('Redis durable key payload exceeds the export limit')
					entries.set(batch[index], { key: batch[index], value, expiresAtUnixMs })
				}
				if (entries.size > MAX_KEYS) throw new Error('Redis durable key count exceeds the export limit')
			}
		} while (cursor !== '0')

		const orderedEntries = [...entries.values()].sort((left, right) => left.key.localeCompare(right.key))

		const info = await redis.info('server')
		const redisVersion = info.match(/^redis_version:([^\r\n]+)/m)?.[1]
		if (!redisVersion) throw new Error('Redis server version is unavailable')

		process.stdout.write(
			`${JSON.stringify({
				schemaVersion: 1,
				capturedAtUnixMs,
				redisVersion,
				includedPrefixes: ['share:', 'ical:'],
				entryCount: orderedEntries.length,
				entries: orderedEntries
			})}\n`
		)
	} finally {
		await redis.quit()
	}
}

main().catch(() => {
	console.error('Redis durable-key export failed')
	process.exitCode = 1
})
