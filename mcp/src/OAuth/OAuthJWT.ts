import { createHash, createHmac, timingSafeEqual } from 'crypto'

const ACCESS_TOKEN_TTL_S = 3600

function base64url(input: string): string {
	return Buffer.from(input).toString('base64url')
}

const HEADER = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

export function signAccessToken(clientId: string, issuer: string, secret: string): string {
	const now = Math.floor(Date.now() / 1000)

	const payload = base64url(JSON.stringify({ iss: issuer, sub: clientId, iat: now, exp: now + ACCESS_TOKEN_TTL_S }))

	const sig = createHmac('sha256', secret).update(`${HEADER}.${payload}`).digest('base64url')

	return `${HEADER}.${payload}.${sig}`
}

export function verifyAccessToken(token: string, secret: string): { sub: string } | null {
	const parts = token.split('.')
	if (parts.length !== 3) return null

	const [header, payload, sig] = parts as [string, string, string]
	const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')

	// constant-time comparison
	const sigBuf = Buffer.from(sig, 'base64url')
	const expBuf = Buffer.from(expected, 'base64url')

	if (sigBuf.length !== expBuf.length) return null
	if (!timingSafeEqual(sigBuf, expBuf)) return null

	const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>

	if (typeof data.exp !== 'number' || Date.now() / 1000 > data.exp) return null

	return { sub: String(data.sub) }
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
	const computed = createHash('sha256').update(codeVerifier).digest('base64url')
	const a = Buffer.from(computed)
	const b = Buffer.from(codeChallenge)
	return a.length === b.length && timingSafeEqual(a, b)
}
