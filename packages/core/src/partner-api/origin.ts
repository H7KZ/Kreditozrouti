const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Canonical form of a browser origin (`scheme://host[:port]`), or null when the input is not a plain origin.
 *
 * Operators type origins by hand, so this is strict: no path, query, fragment or credentials, only http(s), and
 * https unless the host is a loopback address (local development). Wildcards are not supported on purpose: each
 * origin that may use a key is listed explicitly.
 */
export function parseOrigin(raw: string): string | null {
	let url: URL
	try {
		url = new URL(raw.trim())
	} catch {
		return null
	}

	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
	if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) return null
	if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) return null
	if (url.hostname.includes('*')) return null

	return url.origin
}

/**
 * Whether an `Origin` request header is one of the key's allowed origins. The header is compared as sent:
 * browsers always send the canonical form, and the literal `null` (sandboxed frames, file://) never matches.
 */
export function isOriginAllowed(origin: string, allowedOrigins: readonly string[]): boolean {
	return origin !== 'null' && allowedOrigins.includes(origin)
}
