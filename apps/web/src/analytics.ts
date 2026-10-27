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
	// Read through a variable so the guard survives the build (see deployment/AGENTS.md on VITE_* placeholders).
	const env: Record<string, string | undefined> = import.meta.env
	const websiteId = env['VITE_UMAMI_WEBSITE_ID']
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
	initRecorder(websiteId)
}

const RECORD_PATH = '/stats/api/record'

/**
 * Umami's recorder (rrweb) can send two payloads to `/stats/api/record`: `heatmap` (click points and
 * scroll depth) and `record` (a session replay: the page's DOM). Only heatmaps leave the browser,
 * whatever the Umami UI enables, and each of their URLs passes `redactUrl` (the recorder itself
 * sends raw `location.href`, share links included). Returns the body to send, or `null` to drop it.
 */
export function filterRecorderBody(body: string): string | null {
	let parsed: { type?: unknown; payload?: { events?: unknown } }
	try {
		parsed = JSON.parse(body) as typeof parsed
	} catch {
		return null
	}
	if (parsed.type !== 'heatmap' || !Array.isArray(parsed.payload?.events)) return null
	const events = parsed.payload.events.map((event: unknown) => {
		if (typeof event !== 'object' || event === null) return event
		const url = (event as { url?: unknown }).url
		return typeof url === 'string' ? { ...event, url: redactUrl(url) } : event
	})
	return JSON.stringify({ ...parsed, payload: { ...parsed.payload, events } })
}

/** Loads Umami's heatmap recorder first-party after wrapping `fetch` so every recorder request passes `filterRecorderBody`. */
function initRecorder(websiteId: string): void {
	if (document.querySelector('script[src="/stats/recorder.js"]')) return

	const send = window.fetch.bind(window)
	window.fetch = (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
		if (new URL(url, window.location.href).pathname !== RECORD_PATH) return send(input, init)
		const body = typeof init?.body === 'string' ? filterRecorderBody(init.body) : null
		return body === null ? Promise.resolve(new Response(null, { status: 204 })) : send(input, { ...init, body })
	}

	const script = document.createElement('script')
	script.defer = true
	script.src = '/stats/recorder.js'
	script.setAttribute('data-website-id', websiteId)
	script.setAttribute('data-host-url', `${window.location.origin}/stats`)
	document.head.appendChild(script)
}

const analytics = {
	init,
	track(event: string, data?: Record<string, string | number | boolean>): void {
		window.umami?.track(event, data)
	}
}

export default analytics
