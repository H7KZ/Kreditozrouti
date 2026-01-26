import App from '@client/App.vue'
import '@client/index.css'
import { useAlertsStore, useCoursesStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import messages from '@intlify/unplugin-vue-i18n/messages'
import * as Sentry from '@sentry/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const app = createApp(App)

const router = createRouter({
	history: createWebHistory(),
	routes,
	scrollBehavior() {
		// resets scroll position to top on route change
		return { top: 0, left: 0 }
	},
})

// Load saved locale preference from localStorage
const savedLocale = localStorage.getItem('locale')
const defaultLocale = savedLocale && ['cs', 'en'].includes(savedLocale) ? savedLocale : 'cs'

const i18n = createI18n({
	locale: defaultLocale,
	fallbackLocale: 'en',
	messages,
	globalInjection: true,
	legacy: false,
	allowComposition: true,
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

useAlertsStore()
useCoursesStore()
useTimetableStore().hydrate()
useUIStore()
useWizardStore().hydrate()

app.mount('#app')

export { app, i18n, pinia, router }
