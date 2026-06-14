declare global {
	interface Window {
		umami?: {
			track: (event: string, data?: Record<string, string | number | boolean>) => void
		}
	}
}

const UMAMI_SRC = 'https://kreditozrouti.cz/umami/script.js'

function init(): void {
	const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
	if (!websiteId) return

	if (document.querySelector('script[data-website-id]')) return

	const script = document.createElement('script')
	script.defer = true
	script.src = UMAMI_SRC
	script.setAttribute('data-website-id', websiteId)
	document.head.appendChild(script)
}

const analytics = {
	init,
	track(event: string, data?: Record<string, string | number | boolean>): void {
		window.umami?.track(event, data)
	},
}

export default analytics
