<script setup lang="ts">
import type { SchedulerInfo } from '@shared/http/admin'

defineProps<{ schedulers: SchedulerInfo[] }>()

function formatDate(iso: string | null): string {
	if (!iso) return 'â€”'
	return new Date(iso).toLocaleString()
}
</script>

<template>
	<div class="insis-card">
		<h3 class="mb-4 text-base font-semibold text-[var(--insis-text)]">Schedulers</h3>
		<p v-if="schedulers.length === 0" class="text-sm text-[var(--insis-text-2)]">No schedulers active in development</p>
		<table v-else class="insis-table insis-table-dense">
			<thead>
				<tr>
					<th>Scheduler ID</th>
					<th>Pattern</th>
					<th>Next Run</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="s in schedulers" :key="s.id">
					<td>{{ s.id }}</td>
					<td>
						<code class="bg-[var(--insis-bg)] px-1 py-0.5 rounded text-xs font-mono">{{ s.pattern }}</code>
					</td>
					<td>{{ formatDate(s.nextRun) }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
