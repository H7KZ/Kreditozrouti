import { createHash, createHmac, timingSafeEqual } from 'crypto'

const ACCESS_TOKEN_TTL_S = 3600

function base64url(input: string): string {
	return Buffer.from(input).toString('base64url')
}

const HEADER = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

// audience binds the token to the MCP resource (RFC 8707) so a token minted for this server
// cannot be replayed against a different resource that trusts the same signing key.
export function signAccessToken(clientId: string, issuer: string, audience: string, secret: string): string {
	const now = Math.floor(Date.now() / 1000)

	const payload = base64url(JSON.stringify({ iss: issuer, aud: audience, sub: clientId, iat: now, exp: now + ACCESS_TOKEN_TTL_S }))

	const sig = createHmac('sha256', secret).update(`${HEADER}.${payload}`).digest('base64url')

	return `${HEADER}.${payload}.${sig}`
}

export function verifyAccessToken(token: string, secret: string, expected: { issuer: string; audience: string }): { sub: string } | null {
	const parts = token.split('.')
	if (parts.length !== 3) return null

	const [header, payload, sig] = parts as [string, string, string]
	const expectedSig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')

	// constant-time comparison
	const sigBuf = Buffer.from(sig, 'base64url')
	const expBuf = Buffer.from(expectedSig, 'base64url')

	if (sigBuf.length !== expBuf.length) return null
	if (!timingSafeEqual(sigBuf, expBuf)) return null

	const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>

	if (typeof data.exp !== 'number' || Date.now() / 1000 > data.exp) return null

	// Reject tokens not issued by us or not scoped to this resource.
	if (data.iss !== expected.issuer || data.aud !== expected.audience) return null

	return { sub: String(data.sub) }
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
	// RFC 7636 §4.1 - code_verifier must be 43-128 chars from the unreserved set.
	if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(codeVerifier)) return false

	const computed = createHash('sha256').update(codeVerifier).digest('base64url')
	const a = Buffer.from(computed)
	const b = Buffer.from(codeChallenge)
	return a.length === b.length && timingSafeEqual(a, b)
}
