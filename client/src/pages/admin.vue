<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AdminCompletedJobs from '@client/components/admin/AdminCompletedJobs.vue'
import AdminDatabaseStats from '@client/components/admin/AdminDatabaseStats.vue'
import AdminErrorMetrics from '@client/components/admin/AdminErrorMetrics.vue'
import AdminFailedJobs from '@client/components/admin/AdminFailedJobs.vue'
import AdminQueueStats from '@client/components/admin/AdminQueueStats.vue'
import AdminSchedulers from '@client/components/admin/AdminSchedulers.vue'
import AdminScraperTriggers from '@client/components/admin/AdminScraperTriggers.vue'
import { ADMIN_REFRESH_INTERVAL, useAdminStore } from '@client/stores/admin.store'

const admin = useAdminStore()

const tokenInput = ref('')
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Force dark theme on admin page
let wasDark = false
onMounted(() => {
	wasDark = document.documentElement.classList.contains('dark')
	document.documentElement.classList.add('dark')

	admin.loadStats()
	refreshInterval = setInterval(() => admin.loadStats(), ADMIN_REFRESH_INTERVAL)
})

onUnmounted(() => {
	if (!wasDark) {
		document.documentElement.classList.remove('dark')
	}

	if (refreshInterval !== null) {
		clearInterval(refreshInterval)
	}
})

function handleConnect() {
	admin.setToken(tokenInput.value)
	admin.loadStats()
}
</script>

<template>
	<div class="min-h-screen bg-[var(--insis-bg)] p-6">
		<div class="mx-auto max-w-7xl">
			<div class="mb-6 flex items-center justify-between">
				<h1 class="text-2xl font-bold text-[var(--insis-text)]">Admin Dashboard</h1>
				<span v-if="admin.lastRefresh" class="text-sm text-[var(--insis-text-2)]"> Last refreshed: {{ admin.lastRefresh.toLocaleTimeString() }} </span>
			</div>

			<!-- Token input form -->
			<div v-if="!admin.isAuthenticated" class="insis-card p-6">
				<h2 class="mb-4 text-lg font-semibold text-[var(--insis-text)]">Connect to Admin API</h2>
				<form @submit.prevent="handleConnect">
					<label class="insis-label mb-1 block" for="admin-token">API Token</label>
					<input id="admin-token" v-model="tokenInput" class="insis-input mb-4 w-full" type="password" placeholder="Enter admin token" />
					<button type="submit" class="insis-btn insis-btn-primary">Connect</button>
				</form>
			</div>

			<!-- Loading spinner (initial load) -->
			<div v-else-if="admin.loading && !admin.stats" class="flex items-center justify-center py-20">
				<div class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
			</div>

			<!-- Error panel -->
			<div v-else-if="admin.error" class="rounded-lg border border-red-200 bg-red-50 p-6">
				<p class="font-semibold text-red-700">Error loading stats</p>
				<p class="mt-1 text-sm text-red-600">{{ admin.error }}</p>
			</div>

			<!-- Dashboard content -->
			<template v-else-if="admin.stats">
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<AdminQueueStats :stats="admin.stats!.queue.request" />
					<AdminDatabaseStats :database="admin.stats!.database" />
				</div>
				<div class="mt-6">
					<AdminScraperTriggers />
				</div>
				<div class="mt-6">
					<AdminSchedulers :schedulers="admin.stats!.schedulers" />
				</div>
				<div class="mt-6">
					<AdminErrorMetrics :metrics="admin.stats!.errorMetrics" />
				</div>
				<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
					<AdminFailedJobs :jobs="admin.stats!.recentJobs.failed" />
					<AdminCompletedJobs :jobs="admin.stats!.recentJobs.completed" />
				</div>
			</template>
		</div>
	</div>
</template>
