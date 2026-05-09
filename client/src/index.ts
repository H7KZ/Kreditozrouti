import App from '@client/App.vue'
import { i18n } from '@client/i18n'
import '@client/index.css'
import { useAlertsStore, useCoursesStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import * as Sentry from '@sentry/vue'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const app = createApp(App)
const head = createHead()

const router = createRouter({
	history: createWebHistory(),
	routes,
	scrollBehavior() {
		// resets scroll position to top on route change
		return { top: 0, left: 0 }
	},
})

const pinia = createPinia()

if (import.meta.env.VITE_SENTRY_DSN) {
	Sentry.init({
		app,
		dsn: import.meta.env.VITE_SENTRY_DSN,
		environment: import.meta.env.MODE,
		release: import.meta.env.VITE_SENTRY_RELEASE,

		integrations: [
			// Browser tracing for performance monitoring
			Sentry.browserTracingIntegration({ router }),
			// Sentry.replayIntegration()
		],
		tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
		// replaysSessionSampleRate: 0.1,
		// replaysOnErrorSampleRate: 1.0,
		attachProps: true,
	})

	console.log(`Sentry initialized for environment: ${import.meta.env.MODE}`)
}

app.use(router)
app.use(i18n)
app.use(pinia)
app.use(head)

useAlertsStore()
useCoursesStore()
useTimetableStore().hydrate()
useUIStore().hydrate()
useWizardStore().hydrate()

app.mount('#app')

export { app, i18n, pinia, router }
