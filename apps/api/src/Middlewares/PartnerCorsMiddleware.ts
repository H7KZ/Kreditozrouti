import { NextFunction, Request, Response } from 'express'
import { OriginRegistry } from '@api/Services/Partner/OriginRegistry'

const ALLOWED_METHODS = 'GET, OPTIONS'
const ALLOWED_HEADERS = 'Authorization, Content-Type, Accept, Accept-Language, If-None-Match'

/** Response headers a browser client needs to read for quota handling and support requests. */
const EXPOSED_HEADERS = 'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After, WWW-Authenticate, X-Request-Id, ETag'

/** How long a browser may cache a preflight answer, in seconds. */
const PREFLIGHT_MAX_AGE = 600

/**
 * CORS for the partner API. The web app's own allowlist does not apply here (`app.ts` skips `/v1`).
 *
 * Requests without an `Origin` header (servers, curl) pass through untouched. For a browser request the CORS
 * headers are sent when the origin is registered on some API key, on every response including 401, 403 and 429,
 * so a frontend developer can read the error instead of seeing an opaque CORS failure. Whether this particular
 * key may be used from this origin is decided in `partnerApi`. No cookies are involved, so credentials are never
 * allowed.
 */
export async function partnerCors(req: Request, res: Response, next: NextFunction): Promise<void> {
	res.vary('Origin')
	// The data is meant to be read by other origins; helmet's same-origin default would say otherwise.
	res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')

	const origin = req.headers.origin
	if (!origin) {
		if (req.method === 'OPTIONS') res.status(204).end()
		else next()
		return
	}

	const known = await OriginRegistry.isKnown(origin)
	if (known) {
		res.setHeader('Access-Control-Allow-Origin', origin)
		res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS)
	}

	if (req.method === 'OPTIONS') {
		if (known) {
			res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
			res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
			res.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE)
		}
		// An unregistered origin gets a bare 204 without CORS headers, which the browser treats as a refusal.
		res.status(204).end()
		return
	}

	next()
}
