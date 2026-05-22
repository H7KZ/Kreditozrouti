<script setup lang="ts">
import type { ErrorMetrics } from '@shared/http/admin'
import CollapsibleSection from '@client/components/common/CollapsibleSection.vue'

const props = defineProps<{ metrics: ErrorMetrics }>()

function truncate(s: string, max = 60): string {
	return s.length > max ? s.slice(0, max) + 'â€¦' : s
}

function formatTime(timestamp: string): string {
	return new Date(timestamp).toLocaleTimeString()
}

function statusBadgeClass(status: number): string {
	return status >= 500 ? 'insis-badge insis-badge-danger' : 'insis-badge insis-badge-warning'
}

function sortedByStatus(byStatus: Record<string, number>): Array<{ status: string; count: number }> {
	return Object.entries(byStatus)
		.sort(([, a], [, b]) => b - a)
		.map(([status, count]) => ({ status, count }))
}

const hasErrors = props.metrics.last24h.total4xx + props.metrics.last24h.total5xx > 0
</script>

<template>
	<div>
		<!-- Summary row -->
		<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="insis-card p-4">
				<div class="text-sm text-[var(--insis-text-2)]">4xx Errors (24h)</div>
				<div class="mt-1 text-2xl font-bold text-[var(--insis-warning)]">{{ props.metrics.last24h.total4xx }}</div>
			</div>
			<div class="insis-card p-4">
				<div class="text-sm text-[var(--insis-text-2)]">5xx Errors (24h)</div>
				<div class="mt-1 text-2xl font-bold text-[var(--insis-danger)]">{{ props.metrics.last24h.total5xx }}</div>
			</div>
			<div class="insis-card p-4">
				<div class="mb-2 text-sm text-[var(--insis-text-2)]">By Status Code</div>
				<div v-if="sortedByStatus(props.metrics.last24h.byStatus).length === 0" class="text-sm text-[var(--insis-gray-500)]">No errors</div>
				<div v-else class="flex flex-wrap gap-1">
					<span v-for="item in sortedByStatus(props.metrics.last24h.byStatus)" :key="item.status" :class="statusBadgeClass(parseInt(item.status))">
						{{ item.status }}: {{ item.count }}
					</span>
				</div>
			</div>
		</div>

		<!-- Top error paths -->
		<div class="insis-card mb-4 p-4">
			<div class="mb-2 font-semibold text-[var(--insis-text)]">Top Error Paths (last 24h)</div>
			<div v-if="props.metrics.last24h.topPaths.length === 0" class="text-sm text-[var(--insis-gray-500)]">No errors in last 24h</div>
			<div v-else class="overflow-x-auto">
				<table class="insis-table insis-table-dense w-full">
					<thead>
						<tr>
							<th>Path</th>
							<th class="text-right">Count</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in props.metrics.last24h.topPaths" :key="item.path">
							<td>
								<code class="font-mono text-sm">{{ item.path }}</code>
							</td>
							<td class="text-right font-semibold">{{ item.count }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Recent errors table -->
		<CollapsibleSection title="Recent Errors" :badge="props.metrics.recent.length > 0 ? props.metrics.recent.length : undefined" :default-open="hasErrors">
			<div v-if="props.metrics.recent.length === 0" class="py-2 text-sm text-[var(--insis-gray-500)]">No recent errors.</div>
			<div v-else class="w-full overflow-x-auto">
				<table class="insis-table insis-table-dense w-full">
					<thead>
						<tr>
							<th>Status</th>
							<th>Method</th>
							<th>Path</th>
							<th>IP</th>
							<th>Duration</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(error, i) in props.metrics.recent" :key="i">
							<td>
								<span :class="statusBadgeClass(error.status)">{{ error.status }}</span>
							</td>
							<td>{{ error.method }}</td>
							<td>
								<code class="font-mono text-sm" :title="error.path">{{ truncate(error.path) }}</code>
							</td>
							<td>{{ error.ip ?? 'â€”' }}</td>
							<td>{{ error.duration_ms }}ms</td>
							<td>{{ formatTime(error.timestamp) }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</CollapsibleSection>
	</div>
</template>
