declare global {
	interface Window {
		umami?: {
			track: (event: string, data?: Record<string, string | number | boolean>) => void
		}
	}
}

const analytics = {
	track(event: string, data?: Record<string, string | number | boolean>): void {
		window.umami?.track(event, data)
	},
}

export default analytics
