// redirect_uri allowlist - prevents the OAuth flow from being used as an open-redirect
// primitive. Enforced at dynamic client registration and again at the authorize endpoint.

export interface RedirectUriPolicy {
	// Hosts permitted over https. A host matches exactly or as a subdomain (e.g. app.claude.ai).
	allowedHosts: string[]
	// When true, http://localhost and http://127.0.0.1 (any port) are permitted for local dev clients.
	allowLocalhost: boolean
}

const DEFAULT_ALLOWED_HOSTS = ['claude.ai', 'claude.com']

// URL.hostname keeps IPv6 loopback in bracket form ([::1]).
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

// Parse MCP_ALLOWED_REDIRECT_HOSTS (comma-separated) into a normalized host list.
// Falls back to the claude.ai / claude.com defaults when unset or empty.
export function parseAllowedRedirectHosts(raw: string | undefined): string[] {
	const hosts = (raw ?? '')
		.split(',')
		.map(h => h.trim().toLowerCase().replace(/^\.+/, ''))
		.filter(h => h.length > 0)

	return hosts.length > 0 ? hosts : [...DEFAULT_ALLOWED_HOSTS]
}

export function isAllowedRedirectUri(uri: string, policy: RedirectUriPolicy): boolean {
	let url: URL

	try {
		url = new URL(uri)
	} catch {
		return false
	}

	const host = url.hostname.toLowerCase()

	if (url.protocol === 'https:') {
		if (host.length === 0) return false

		return policy.allowedHosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`))
	}

	if (url.protocol === 'http:' && policy.allowLocalhost) {
		return LOCALHOST_HOSTNAMES.has(host)
	}

	return false
}
