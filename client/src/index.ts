import App from '@client/App.vue'
import '@client/index.css'
import { useAlertsStore } from '@client/stores/alerts'
import messages from '@intlify/unplugin-vue-i18n/messages'
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

const i18n = createI18n({
	locale: 'en',
	messages,
	globalInjection: true,
	legacy: false,
	allowComposition: true,
})

const pinia = createPinia()

app.use(router)
app.use(i18n)
app.use(pinia)

useAlertsStore()

app.mount('#app')

export { app, i18n, pinia, router }
