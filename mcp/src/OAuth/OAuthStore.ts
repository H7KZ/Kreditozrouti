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

// In-memory stores - fine for stateless public OAuth (no sensitive data protected)
const clients = new Map<string, RegisteredClient>()
const codes = new Map<string, AuthCode>()

const CODE_TTL_MS = 60_000

export const OAuthStore = {
	registerClient(params: { clientName?: string; redirectUris: string[] }): RegisteredClient {
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
		return clients.get(clientId)
	},

	createCode(params: { clientId: string; redirectUri: string; codeChallenge: string }): string {
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
