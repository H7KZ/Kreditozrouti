declare global {
	interface Window {
		umami?: {
			track: (event: string, data?: Record<string, string | number | boolean>) => void
		}
	}
}

function init(): void {
	const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
	const src = import.meta.env.VITE_UMAMI_SRC
	if (!websiteId || !src) return

	if (document.querySelector('script[data-website-id]')) return

	const script = document.createElement('script')
	script.defer = true
	script.src = src
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
