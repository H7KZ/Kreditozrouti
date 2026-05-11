<script setup lang="ts">
import type { CompletedJob } from '@api/Controllers/Admin/AdminStatsController'
import CollapsibleSection from '@client/components/common/CollapsibleSection.vue'

interface Props {
	jobs: CompletedJob[]
}

const props = defineProps<Props>()

function formatFinishedOn(finishedOn: number | undefined): string {
	if (finishedOn === undefined) return '—'
	return new Date(finishedOn).toLocaleString()
}
</script>

<template>
	<CollapsibleSection title="Completed Jobs" :badge="props.jobs.length > 0 ? props.jobs.length : undefined">
		<div v-if="props.jobs.length === 0" class="text-[var(--insis-gray-500)] text-sm py-2">No completed jobs.</div>

		<table v-else class="insis-table insis-table-dense w-full">
			<thead>
				<tr>
					<th>Job Name</th>
					<th>Type</th>
					<th>Finished At</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="job in props.jobs" :key="job.id ?? job.name">
					<td>{{ job.name }}</td>
					<td>{{ (job.data.type as string) ?? '—' }}</td>
					<td>{{ formatFinishedOn(job.finishedOn) }}</td>
				</tr>
			</tbody>
		</table>
	</CollapsibleSection>
</template>
