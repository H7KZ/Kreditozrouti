import type { Request, Response, Router as RouterType } from 'express'
import { Router } from 'express'
import Config from '@mcp/Config/Config'
import { signAccessToken, verifyPkce } from '@mcp/OAuth/OAuthJWT'
import { OAuthStore } from '@mcp/OAuth/OAuthStore'

const router: RouterType = Router()

// RFC 9728 — protected resource metadata
router.get('/.well-known/oauth-protected-resource', (_req: Request, res: Response) => {
	res.json({
		resource: `${Config.baseUrl}/mcp`,
		authorization_servers: [Config.baseUrl]
	})
})

// RFC 8414 — authorization server metadata
router.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
	const base = Config.baseUrl

	res.json({
		issuer: base,
		authorization_endpoint: `${base}/mcp/oauth/authorize`,
		token_endpoint: `${base}/mcp/oauth/token`,
		registration_endpoint: `${base}/mcp/oauth/register`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code'],
		code_challenge_methods_supported: ['S256'],
		token_endpoint_auth_methods_supported: ['none']
	})
})

// RFC 7591 — dynamic client registration (auto-approve: public data)
router.post('/mcp/oauth/register', (req: Request, res: Response) => {
	const body = req.body as Record<string, unknown>
	const redirectUris = Array.isArray(body.redirect_uris) ? (body.redirect_uris as string[]) : []

	if (redirectUris.length === 0) {
		res.status(400).json({ error: 'invalid_client_metadata', error_description: 'redirect_uris required' })
		return
	}

	const client = OAuthStore.registerClient({
		clientName: typeof body.client_name === 'string' ? body.client_name : undefined,
		redirectUris
	})

	res.status(201).json({
		client_id: client.clientId,
		client_name: client.clientName,
		redirect_uris: client.redirectUris,
		grant_types: ['authorization_code'],
		response_types: ['code'],
		token_endpoint_auth_method: 'none'
	})
})

// OAuth 2.1 authorization endpoint — auto-approves (public server, no user login needed)
router.get('/mcp/oauth/authorize', (req: Request, res: Response) => {
	const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query as Record<string, string>

	if (!client_id || !redirect_uri || !code_challenge || code_challenge_method !== 'S256') {
		res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters or unsupported code_challenge_method' })
		return
	}

	const client = OAuthStore.getClient(client_id)
	if (!client) {
		res.status(400).json({ error: 'invalid_client', error_description: 'Unknown client_id' })
		return
	}

	if (!client.redirectUris.includes(redirect_uri)) {
		res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri not registered' })
		return
	}

	const code = OAuthStore.createCode({ clientId: client_id, redirectUri: redirect_uri, codeChallenge: code_challenge })

	const redirectUrl = new URL(redirect_uri)

	redirectUrl.searchParams.set('code', code)

	if (state) redirectUrl.searchParams.set('state', state)

	res.redirect(302, redirectUrl.toString())
})

// OAuth 2.1 token endpoint
router.post('/mcp/oauth/token', (req: Request, res: Response) => {
	const body = req.body as Record<string, unknown>
	const { grant_type, code, redirect_uri, code_verifier } = body as Record<string, string>

	if (grant_type !== 'authorization_code') {
		res.status(400).json({ error: 'unsupported_grant_type' })
		return
	}

	if (!code || !redirect_uri || !code_verifier) {
		res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' })
		return
	}

	const entry = OAuthStore.consumeCode(code)
	if (!entry) {
		res.status(400).json({ error: 'invalid_grant', error_description: 'Code expired or invalid' })
		return
	}

	if (entry.redirectUri !== redirect_uri) {
		res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' })
		return
	}

	if (!verifyPkce(code_verifier, entry.codeChallenge)) {
		res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' })
		return
	}

	const accessToken = signAccessToken(entry.clientId, Config.baseUrl, Config.jwtSecret)

	res.json({
		access_token: accessToken,
		token_type: 'Bearer',
		expires_in: 3600
	})
})

export { router as oauthRouter }
