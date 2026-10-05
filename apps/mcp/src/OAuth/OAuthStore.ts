import { randomUUID } from 'crypto'

interface RegisteredClient {
	clientId: string
	clientName: string
	redirectUris: string[]
	registeredAt: number
}

interface AuthCode {
	clientId: string
	redirectUri: string
	codeChallenge: string
	expiresAt: number
}

// In-memory stores - fine for stateless public OAuth (no sensitive data protected).
// Bounded (cap + TTL) so an anonymous register/authorize flood cannot grow the heap without bound.
const clients = new Map<string, RegisteredClient>()
const codes = new Map<string, AuthCode>()

const CODE_TTL_MS = 60_000
// Registered clients live long enough to complete a flow and reconnect, but are not kept forever.
const CLIENT_TTL_MS = 24 * 60 * 60_000
// Hard caps: once reached, the oldest entries are evicted to make room (FIFO by insertion order).
const MAX_CLIENTS = 10_000
const MAX_CODES = 10_000
const SWEEP_INTERVAL_MS = 60_000

function evictOldest<T>(map: Map<string, T>, max: number): void {
	while (map.size >= max) {
		const oldest = map.keys().next().value
		if (oldest === undefined) break
		map.delete(oldest)
	}
}

function sweep(now: number): void {
	for (const [id, client] of clients) {
		if (now - client.registeredAt > CLIENT_TTL_MS) clients.delete(id)
	}

	for (const [code, entry] of codes) {
		if (now > entry.expiresAt) codes.delete(code)
	}
}

// Periodic sweep drops abandoned codes and stale clients even when no traffic touches them.
// unref() so the timer never keeps the process alive.
const sweepTimer = setInterval(() => sweep(Date.now()), SWEEP_INTERVAL_MS)
sweepTimer.unref?.()

export const OAuthStore = {
	registerClient(params: { clientName?: string; redirectUris: string[] }): RegisteredClient {
		evictOldest(clients, MAX_CLIENTS)

		const clientId = randomUUID()
		const client: RegisteredClient = {
			clientId,
			clientName: params.clientName ?? 'Unknown Client',
			redirectUris: params.redirectUris,
			registeredAt: Date.now()
		}

		clients.set(clientId, client)

		return client
	},

	getClient(clientId: string): RegisteredClient | undefined {
		const client = clients.get(clientId)

		if (!client) return undefined

		if (Date.now() - client.registeredAt > CLIENT_TTL_MS) {
			clients.delete(clientId)
			return undefined
		}

		return client
	},

	createCode(params: { clientId: string; redirectUri: string; codeChallenge: string }): string {
		evictOldest(codes, MAX_CODES)

		const code = randomUUID()

		codes.set(code, {
			clientId: params.clientId,
			redirectUri: params.redirectUri,
			codeChallenge: params.codeChallenge,
			expiresAt: Date.now() + CODE_TTL_MS
		})

		return code
	},

	consumeCode(code: string): AuthCode | null {
		const entry = codes.get(code)

		codes.delete(code)

		if (!entry) return null

		if (Date.now() > entry.expiresAt) return null

		return entry
	}
}
