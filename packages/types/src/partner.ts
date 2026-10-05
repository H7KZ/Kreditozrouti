/** Scopes an API key can carry. A key may only hold scopes; plans bound quota, not scopes. */
export const ApiScopeValues = ['catalogue:read', 'lecturers:read', 'usage:read'] as const
export type ApiScope = (typeof ApiScopeValues)[number]

/** Identity attached to a request authenticated with a partner API key. */
export interface PartnerPrincipal {
	consumerId: number
	consumerSlug: string
	keyId: number
	keyPrefix: string
	scopes: ApiScope[]
	plan: {
		name: string
		requestsPerMinute: number
		requestsPerDay: number
	}
}

/** Body of `GET /v1/usage`. */
export interface PartnerUsageDTO {
	consumer: string
	plan: { name: string; requests_per_minute: number; requests_per_day: number }
	today: { used: number | null; remaining: number | null; resets_at: string }
	days: { date: string; requests: number; errors: number }[]
}
