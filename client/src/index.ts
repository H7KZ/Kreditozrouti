import App from '@client/App.vue'
import { i18n } from '@client/i18n'
import '@client/index.css'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import faro from '@client/faro'
import { useAlertsStore, useCoursesStore, useScheduleSlotsStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'

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

// Initialise Faro browser telemetry (no-op if VITE_FARO_COLLECTOR_URL is unset)
faro.init(app)

app.use(router)
app.use(i18n)
app.use(pinia)
app.use(head)

useAlertsStore()
useCoursesStore()
useScheduleSlotsStore().hydrate()
useTimetableStore().hydrate()
useUIStore().hydrate()
useWizardStore().hydrate()

app.mount('#app')

export { app, i18n, pinia, router }
