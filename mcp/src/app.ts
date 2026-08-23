import type { Express, NextFunction, Request, Response } from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import Config from '@mcp/Config/Config'
import { verifyAccessToken } from '@mcp/OAuth/OAuthJWT'
import { oauthRouter } from '@mcp/OAuth/OAuthRoutes'
import { createServer } from '@mcp/server'

const app: Express = express()

// Behind Traefik in deployed environments every request arrives from the proxy IP; trust the
// first hop so express-rate-limit keys on the real client IP (X-Forwarded-For) instead of
// bucketing all clients together (and so v7 doesn't throw on a forwarded header it distrusts).
if (Config.nodeEnv !== 'development') app.set('trust proxy', 1)

app.use(express.json())

// Token endpoint receives application/x-www-form-urlencoded (RFC 6749)
app.use(express.urlencoded({ extended: false }))

// Rate limit the OAuth endpoints (register/authorize/token) so a registration or
// authorize flood cannot grow the in-memory store without bound.
const oauthLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false })

// OAuth endpoints - well-known discovery routes are cheap/read-only, so only throttle the mutating flow.
app.use(['/mcp/oauth/register', '/mcp/oauth/authorize', '/mcp/oauth/token'], oauthLimiter)
app.use(oauthRouter)

// Stricter limit for the CPU-intensive optimizer tool
const optimizerLimiter = rateLimit({
	windowMs: 60_000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	// Apply the cap whenever an optimizer call is present - including inside a JSON-RPC batch
	// (array body), which would otherwise leave params undefined and bypass the limit.
	skip: req => {
		const isOptimizer = (msg: unknown): boolean => (msg as { params?: { name?: string } } | undefined)?.params?.name === 'vse_optimize_timetable'
		const body: unknown = req.body
		return Array.isArray(body) ? !body.some(isOptimizer) : !isOptimizer(body)
	}
})

// General rate limit: 100 req/min
const generalLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false })

// Bearer token validation - require valid JWT from our OAuth flow
function requireBearer(req: Request, res: Response, next: NextFunction): void {
	const auth = req.headers.authorization
	if (!auth?.startsWith('Bearer ')) {
		res.status(401)
			.set('WWW-Authenticate', `Bearer resource_metadata="${Config.baseUrl}/.well-known/oauth-protected-resource"`)
			.json({ error: 'unauthorized', error_description: 'Bearer token required' })
		return
	}
	const token = auth.slice(7)
	const payload = verifyAccessToken(token, Config.jwtSecret, { issuer: Config.baseUrl, audience: `${Config.baseUrl}/mcp` })
	if (!payload) {
		res.status(401)
			.set('WWW-Authenticate', `Bearer realm="${Config.baseUrl}", error="invalid_token"`)
			.json({ error: 'invalid_token', error_description: 'Token expired or invalid' })
		return
	}
	next()
}

app.post('/mcp', requireBearer, optimizerLimiter, generalLimiter, async (req, res) => {
	const server = createServer()
	const transport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined // stateless - no session IDs
	})
	await server.connect(transport)
	await transport.handleRequest(req, res, req.body)
})

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' })
})

export { app }
