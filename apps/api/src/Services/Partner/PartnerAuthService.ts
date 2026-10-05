import type { ApiScope, PartnerPrincipal } from '@kreditozrouti/types'
import { apiKeyMatchesHash, extractBearerToken, parseApiKey } from '@kreditozrouti/core/partner-api'
import { ApiScopeValues } from '@kreditozrouti/types'
import { mysql, redis } from '@api/clients'
import { ApiConsumerTable, ApiKeyTable, ApiPlanTable } from '@api/Database/types'

export type PartnerAuthFailure = 'missing' | 'malformed' | 'unknown_key' | 'revoked' | 'expired' | 'consumer_disabled'

export type PartnerAuthResult = { ok: true; principal: PartnerPrincipal } | { ok: false; reason: PartnerAuthFailure }

interface KeyRecord {
	keyId: number
	keyHash: string
	prefix: string
	scopes: ApiScope[]
	revokedAt: Date | null
	expiresAt: Date | null
	consumerId: number
	consumerSlug: string
	consumerDisabledAt: Date | null
	plan: PartnerPrincipal['plan']
}

/**
 * A revoked key keeps working for at most this long on a replica that cached it. Short enough for revocation
 * to feel immediate, long enough that a busy partner does not hit MySQL on every request.
 */
const CACHE_TTL_MS = 15_000
const CACHE_MAX_ENTRIES = 1000
const LAST_USED_INTERVAL_SECONDS = 60

const cache = new Map<string, { record: KeyRecord | null; expiresAt: number }>()

async function loadKey(prefix: string): Promise<KeyRecord | null> {
	const cached = cache.get(prefix)
	if (cached && cached.expiresAt > Date.now()) return cached.record

	const row = await mysql
		.selectFrom(`${ApiKeyTable._table} as k`)
		.innerJoin(`${ApiConsumerTable._table} as c`, 'c.id', 'k.consumer_id')
		.innerJoin(`${ApiPlanTable._table} as p`, 'p.id', 'c.plan_id')
		.select([
			'k.id as key_id',
			'k.key_hash',
			'k.prefix',
			'k.scopes',
			'k.revoked_at',
			'k.expires_at',
			'c.id as consumer_id',
			'c.slug as consumer_slug',
			'c.disabled_at as consumer_disabled_at',
			'p.name as plan_name',
			'p.requests_per_minute',
			'p.requests_per_day'
		])
		.where('k.prefix', '=', prefix)
		.executeTakeFirst()

	const record: KeyRecord | null = row
		? {
				keyId: row.key_id,
				keyHash: row.key_hash,
				prefix: row.prefix,
				scopes: row.scopes.filter((s): s is ApiScope => (ApiScopeValues as readonly string[]).includes(s)),
				revokedAt: row.revoked_at,
				expiresAt: row.expires_at,
				consumerId: row.consumer_id,
				consumerSlug: row.consumer_slug,
				consumerDisabledAt: row.consumer_disabled_at,
				plan: { name: row.plan_name, requestsPerMinute: row.requests_per_minute, requestsPerDay: row.requests_per_day }
			}
		: null

	if (cache.size >= CACHE_MAX_ENTRIES) cache.clear()
	cache.set(prefix, { record, expiresAt: Date.now() + CACHE_TTL_MS })

	return record
}

/** Records `last_used_at` at most once per minute per key, so a busy key costs one write a minute. */
function touchLastUsed(keyId: number): void {
	redis
		.set(`apikey:last_used:${keyId}`, '1', 'EX', LAST_USED_INTERVAL_SECONDS, 'NX')
		.then(async acquired => {
			if (acquired !== 'OK') return
			await mysql
				.updateTable(ApiKeyTable._table)
				.set({ last_used_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
				.where('id', '=', keyId)
				.execute()
		})
		.catch(() => {
			/* last_used_at is informational, never fail a request over it */
		})
}

export const PartnerAuthService = {
	/** Resolves an `Authorization` header to a principal. The reason is for logs only and must not be sent to the caller. */
	async authenticate(authorizationHeader: string | undefined): Promise<PartnerAuthResult> {
		const token = extractBearerToken(authorizationHeader)
		if (!token) return { ok: false, reason: 'missing' }

		const parsed = parseApiKey(token)
		if (!parsed) return { ok: false, reason: 'malformed' }

		const record = await loadKey(parsed.prefix)
		if (!record || !apiKeyMatchesHash(parsed.key, record.keyHash)) return { ok: false, reason: 'unknown_key' }

		const now = Date.now()
		if (record.revokedAt) return { ok: false, reason: 'revoked' }
		if (record.expiresAt && record.expiresAt.getTime() <= now) return { ok: false, reason: 'expired' }
		if (record.consumerDisabledAt) return { ok: false, reason: 'consumer_disabled' }

		touchLastUsed(record.keyId)

		return {
			ok: true,
			principal: {
				consumerId: record.consumerId,
				consumerSlug: record.consumerSlug,
				keyId: record.keyId,
				keyPrefix: record.prefix,
				scopes: record.scopes,
				plan: record.plan
			}
		}
	}
}

export function hasScope(principal: PartnerPrincipal, scope: ApiScope): boolean {
	return principal.scopes.includes(scope)
}
