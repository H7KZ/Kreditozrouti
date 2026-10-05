import { mysql } from '@api/clients'
import { ApiConsumerTable, ApiKeyTable } from '@api/Database/types'

/** Same freshness as the key cache, so a revoked key stops opening CORS on the same schedule. */
const CACHE_TTL_MS = 15_000

let cache: { origins: Set<string>; expiresAt: number } | null = null

async function loadOrigins(): Promise<Set<string>> {
	const now = new Date()
	const rows = await mysql
		.selectFrom(`${ApiKeyTable._table} as k`)
		.innerJoin(`${ApiConsumerTable._table} as c`, 'c.id', 'k.consumer_id')
		.select('k.allowed_origins')
		.where('k.allowed_origins', 'is not', null)
		.where('k.revoked_at', 'is', null)
		.where('c.disabled_at', 'is', null)
		.where(eb => eb.or([eb('k.expires_at', 'is', null), eb('k.expires_at', '>', now)]))
		.execute()

	const origins = new Set<string>()
	for (const row of rows) {
		for (const origin of row.allowed_origins ?? []) origins.add(origin)
	}
	return origins
}

/**
 * The origins registered on at least one usable API key.
 *
 * A browser's CORS preflight carries no `Authorization` header, so the server cannot tell which key will be
 * used. Answering preflights for exactly the registered origins lets a legitimate frontend through and gives
 * every other origin nothing; the per-key origin check on the real request is what binds a key to its origins.
 */
export const OriginRegistry = {
	async isKnown(origin: string): Promise<boolean> {
		if (!cache || cache.expiresAt <= Date.now()) {
			try {
				cache = { origins: await loadOrigins(), expiresAt: Date.now() + CACHE_TTL_MS }
			} catch {
				// Database trouble must not open CORS: keep the last known set, or none if there is no earlier one.
				cache = { origins: cache?.origins ?? new Set(), expiresAt: Date.now() + CACHE_TTL_MS }
			}
		}
		return cache.origins.has(origin)
	}
}
