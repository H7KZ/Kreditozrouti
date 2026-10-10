const Redis = require('ioredis')
const dns = require('node:dns').promises

const KEY_PATTERN = /^(share|ical):[A-Za-z0-9_-]+$/
const PREFIXES = ['share:', 'ical:']
const MAX_KEYS = 100_000
const MAX_BYTES = 64 * 1024 * 1024

async function readStdin() {
	const chunks = []
	for await (const chunk of process.stdin) chunks.push(chunk)
	return Buffer.concat(chunks).toString('utf8')
}

async function existingDurableKeys(redis) {
	const keys = []
	for (const prefix of PREFIXES) {
		let cursor = '0'
		do {
			const result = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 500)
			cursor = result[0]
			keys.push(...result[1])
		} while (cursor !== '0')
	}
	return keys
}

async function main() {
	const document = JSON.parse(await readStdin())
	if (document.schemaVersion !== 1 || !Array.isArray(document.entries)) throw new Error('unsupported Redis backup schema')
	if (document.entries.length > MAX_KEYS) throw new Error('Redis backup key count exceeds the restore limit')
	if (!process.env.REDIS_URI) throw new Error('recovery Redis URI is missing')
	let redisUrl
	try {
		redisUrl = new URL(process.env.REDIS_URI)
	} catch {
		throw new Error('recovery Redis URI is invalid')
	}
	if (!['redis:', 'rediss:'].includes(redisUrl.protocol) || Number(redisUrl.port || 6379) !== 6379) {
		throw new Error('recovery Redis URI must use the isolated Redis service on port 6379')
	}
	let allowedAddresses
	try {
		allowedAddresses = new Set(JSON.parse(process.env.RECOVERY_REDIS_ALLOWED_IPS || '[]'))
	} catch {
		throw new Error('isolated recovery Redis addresses are invalid')
	}
	if (allowedAddresses.size === 0 || [...allowedAddresses].some((address) => typeof address !== 'string')) {
		throw new Error('isolated recovery Redis addresses are missing')
	}
	const resolvedAddresses = await dns.lookup(redisUrl.hostname, { all: true, verbatim: true })
	if (resolvedAddresses.length === 0 || resolvedAddresses.some(({ address }) => !allowedAddresses.has(address))) {
		throw new Error('recovery Redis URI does not resolve exclusively to the isolated recovery Redis container')
	}
	const database = redisUrl.pathname.slice(1) || '0'
	if (!/^\d+$/.test(database)) throw new Error('recovery Redis URI has an invalid database number')

	const seen = new Set()
	let totalBytes = 0
	for (const entry of document.entries) {
		if (!entry || typeof entry.key !== 'string' || !KEY_PATTERN.test(entry.key) || seen.has(entry.key)) {
			throw new Error('Redis backup has an invalid or duplicate key')
		}
		if (typeof entry.value !== 'string' || !Number.isSafeInteger(entry.expiresAtUnixMs) || entry.expiresAtUnixMs < 0) {
			throw new Error('Redis backup has an invalid value or expiry')
		}
		JSON.parse(entry.value)
		totalBytes += Buffer.byteLength(entry.key) + Buffer.byteLength(entry.value)
		seen.add(entry.key)
	}
	if (totalBytes > MAX_BYTES) throw new Error('Redis backup payload exceeds the restore limit')

	const redis = new Redis({
		host: resolvedAddresses[0].address,
		port: 6379,
		username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
		password: process.env.REDIS_PASSWORD || decodeURIComponent(redisUrl.password),
		db: Number(database),
		...(redisUrl.protocol === 'rediss:' ? { tls: { servername: redisUrl.hostname } } : {}),
		maxRetriesPerRequest: 3,
		connectTimeout: 10_000,
		commandTimeout: 30_000
	})
	try {
		const existing = await existingDurableKeys(redis)
		if (existing.length > 0) throw new Error('target Redis already contains durable share/calendar keys')

		const [seconds, microseconds] = await redis.time()
		const nowUnixMs = Number(seconds) * 1000 + Math.floor(Number(microseconds) / 1000)
		const unexpired = document.entries.filter((entry) => entry.expiresAtUnixMs > nowUnixMs)
		for (let offset = 0; offset < unexpired.length; offset += 100) {
			const transaction = redis.multi()
			for (const entry of unexpired.slice(offset, offset + 100)) {
				transaction.set(entry.key, entry.value, 'PXAT', String(entry.expiresAtUnixMs), 'NX')
			}
			const replies = await transaction.exec()
			if (!replies || replies.some(([error, result]) => error || result !== 'OK')) {
				throw new Error('Redis restore batch failed; discard the isolated recovery Redis and retry')
			}
		}
		process.stdout.write(`restored=${unexpired.length} expired_skipped=${document.entries.length - unexpired.length}\n`)
	} finally {
		await redis.quit()
	}
}

main().catch(() => {
	console.error('Redis durable-key restore failed; inspect the isolated recovery target')
	process.exitCode = 1
})
