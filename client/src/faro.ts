import type { Faro } from '@grafana/faro-web-sdk'
import type { App } from 'vue'
import { createSession, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

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
				environment: import.meta.env.MODE,
			},
			sessionTracking: {
				enabled: true,
				session: createSession(),
			},
			// Filter Safari's internal JSON-LD parser false-positive.
			// The parser fires this when a page has no @context object.
			ignoreErrors: [/undefined is not an object \(evaluating '.*\["@context"\]/],
			instrumentations: [
				...getWebInstrumentations({
					captureConsole: true,
				}),
				new TracingInstrumentation(),
			],
		})

		// Vue component error handler — captures errors thrown inside Vue components
		app.config.errorHandler = (error, _instance, info) => {
			_faro?.api.pushError(error instanceof Error ? error : new Error(String(error)), {
				context: { componentInfo: info ?? 'unknown' },
			})
			// Re-throw so Vue's own console.error still fires in development
			throw error
		}
	},
}

export default faroModule
