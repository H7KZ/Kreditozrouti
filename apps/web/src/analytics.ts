declare global {
	interface Window {
		umami?: {
			track: (event: string, data?: Record<string, string | number | boolean>) => void
		}
		__kreditozroutiUmamiBeforeSend?: (type: string, payload: UmamiPayload) => UmamiPayload
	}
}

interface UmamiPayload {
	url?: string
	referrer?: string
	title?: string
	[key: string]: unknown
}

/**
 * Share links (`/s/<id>`) are capabilities: whoever holds the id sees the shared timetable. Every URL
 * sent to Umami or Faro passes through here first, and the monitoring stack's Alloy pipeline redacts
 * the same pattern again on the way in.
 */
const PRIVATE_PATHS: readonly { pattern: RegExp; replacement: string }[] = [{ pattern: /\/s\/[^/]+/, replacement: '/s/[id]' }]

/** Rewrites private segments out of an absolute URL or a bare path, keeps the origin, and drops query and hash. */
export function redactUrl(url: string): string {
	const origin = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i.exec(url)?.[0] ?? ''
	let path = url.slice(origin.length).split(/[?#]/, 1)[0] ?? ''
	for (const rule of PRIVATE_PATHS) path = path.replace(rule.pattern, rule.replacement)
	return origin + (path || (origin ? '/' : ''))
}

function isPrivate(url: string): boolean {
	return PRIVATE_PATHS.some(rule => rule.pattern.test(url))
}

/**
 * Loads the Umami tracker first-party: Traefik routes `/stats` on this origin to the monitoring
 * stack's Umami, so no third-party host sees the visitor and ad blockers that list Umami hosts do
 * not break analytics. Off when no website id is configured.
 */
function init(): void {
	const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
	if (!websiteId) return

	if (document.querySelector('script[data-website-id]')) return

	window.__kreditozroutiUmamiBeforeSend = (_type, payload) => {
		const redacted = { ...payload }
		if (typeof payload.url === 'string') {
			if (isPrivate(payload.url)) redacted.title = ''
			redacted.url = redactUrl(payload.url)
		}
		if (typeof payload.referrer === 'string' && payload.referrer) redacted.referrer = redactUrl(payload.referrer)
		return redacted
	}

	const script = document.createElement('script')
	script.defer = true
	script.src = '/stats/stats.js'
	script.setAttribute('data-website-id', websiteId)
	script.setAttribute('data-host-url', `${window.location.origin}/stats`)
	script.setAttribute('data-exclude-search', 'true')
	script.setAttribute('data-exclude-hash', 'true')
	script.setAttribute('data-before-send', '__kreditozroutiUmamiBeforeSend')
	document.head.appendChild(script)
}

const analytics = {
	init,
	track(event: string, data?: Record<string, string | number | boolean>): void {
		window.umami?.track(event, data)
	}
}

export default analytics
