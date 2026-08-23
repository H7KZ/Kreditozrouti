import type { Faro } from '@grafana/faro-web-sdk'
import type { App } from 'vue'
import { ErrorsInstrumentation, initializeFaro, WebVitalsInstrumentation } from '@grafana/faro-web-sdk'

let _faro: Faro | null = null

const faroModule = {
	isEnabled(): boolean {
		return !!import.meta.env.VITE_FARO_COLLECTOR_URL
	},

	init(app: App): void {
		if (!faroModule.isEnabled()) return

		_faro = initializeFaro({
			url: import.meta.env.VITE_FARO_COLLECTOR_URL as string,
			app: {
				name: 'kreditozrouti',
				version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'unknown',
				environment: (import.meta.env.VITE_APP_ENV as string | undefined) ?? import.meta.env.MODE
			},
			// Session tracking is intentionally disabled: no persistent pseudonymous
			// identifier is stored in web storage. This keeps Faro out of ePrivacy
			// Art 5(3) scope and consistent with the privacy policy (no identifiers,
			// no behavioural tracking). See client/src/pages/docs/*/legal/privacy.md.
			sessionTracking: {
				enabled: false
			},
			// Filter Safari's internal JSON-LD parser false-positive.
			// The parser fires this when a page has no @context object.
			ignoreErrors: [/undefined is not an object \(evaluating '.*\["@context"\]/],
			// Errors + Web Vitals only. Deliberately NOT using getWebInstrumentations()
			// which would also add Session/View/Navigation/UserAction/Performance
			// instrumentations (behavioural RUM that duplicates Umami and would need
			// consent). captureConsole is off, so no console output is shipped.
			instrumentations: [new ErrorsInstrumentation(), new WebVitalsInstrumentation()]
		})

		// Vue component error handler — captures errors thrown inside Vue components
		app.config.errorHandler = (error, _instance, info) => {
			_faro?.api.pushError(error instanceof Error ? error : new Error(String(error)), {
				context: { componentInfo: info ?? 'unknown' }
			})
			// Re-throw so Vue's own console.error still fires in development
			throw error
		}
	}
}

export default faroModule
