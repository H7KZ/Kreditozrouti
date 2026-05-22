import type { AdminStatsResponse } from '@client/services/adminService'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchAdminStats, triggerCatalogScrape, triggerStudyPlansScrape } from '@client/services/adminService'
import { useAlertsStore } from '@client/stores/alerts.store'

export const ADMIN_REFRESH_INTERVAL = 30_000

export const useAdminStore = defineStore('admin', () => {
	const stats = ref<AdminStatsResponse | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const token = ref(import.meta.env.VITE_API_COMMAND_TOKEN ?? '')
	const lastRefresh = ref<Date | null>(null)

	const isAuthenticated = computed(() => token.value.length > 0)

	function setToken(t: string) {
		token.value = t
	}

	async function loadStats() {
		if (!token.value) return
		loading.value = true
		error.value = null
		try {
			stats.value = await fetchAdminStats(token.value)
			lastRefresh.value = new Date()
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to load admin stats'
		} finally {
			loading.value = false
		}
	}

	async function runCatalogScrape() {
		const alerts = useAlertsStore()
		try {
			await triggerCatalogScrape(token.value)
			alerts.addAlert({ type: 'success', description: 'Catalog scrape triggered successfully', timeout: 5000 })
		} catch (e) {
			alerts.addAlert({
				type: 'error',
				description: e instanceof Error ? e.message : 'Failed to trigger catalog scrape',
				timeout: 5000,
			})
		}
	}

	async function runStudyPlansScrape() {
		const alerts = useAlertsStore()
		try {
			await triggerStudyPlansScrape(token.value)
			alerts.addAlert({ type: 'success', description: 'Study plans scrape triggered successfully', timeout: 5000 })
		} catch (e) {
			alerts.addAlert({
				type: 'error',
				description: e instanceof Error ? e.message : 'Failed to trigger study plans scrape',
				timeout: 5000,
			})
		}
	}

	return {
		stats,
		loading,
		error,
		token,
		lastRefresh,
		isAuthenticated,
		setToken,
		loadStats,
		runCatalogScrape,
		runStudyPlansScrape,
	}
})
