<script setup lang="ts">
import CollapsibleSection from '@client/components/common/CollapsibleSection.vue'
import type { FailedJob } from '@shared/http/admin'

interface Props {
	jobs: FailedJob[]
}

const props = defineProps<Props>()

function truncate(s: string, max = 60): string {
	return s.length > max ? s.slice(0, max) + 'â€¦' : s
}

function formatFailedAt(processedOn: number | undefined): string {
	if (processedOn === undefined) return 'â€”'
	return new Date(processedOn).toLocaleString()
}
</script>

<template>
	<div :class="{ 'admin-failed-jobs--has-errors': props.jobs.length > 0 }">
		<CollapsibleSection title="Failed Jobs" :badge="props.jobs.length > 0 ? props.jobs.length : undefined" :default-open="props.jobs.length > 0">
			<div v-if="props.jobs.length === 0" class="text-[var(--insis-gray-500)] text-sm py-2">No failed jobs.</div>

			<div v-else class="overflow-x-auto w-full">
				<table class="insis-table insis-table-dense w-full">
					<thead>
						<tr>
							<th>Job Name</th>
							<th>Failed At</th>
							<th>Reason</th>
							<th>Type</th>
							<th>URL / Faculty</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="job in props.jobs" :key="job.id ?? job.name">
							<td>{{ job.name }}</td>
							<td>{{ formatFailedAt(job.processedOn) }}</td>
							<td>{{ job.failedReason ?? 'â€”' }}</td>
							<td>{{ (job.data.type as string) ?? 'â€”' }}</td>
							<td>
								<template v-if="job.data.url as string">
									<span :title="job.data.url as string">
										{{ truncate((job.data.url as string) ?? '') }}
									</span>
								</template>
								<template v-else-if="job.data.facultyId as string">
									{{ job.data.facultyId as string }}
								</template>
								<template v-else>â€”</template>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</CollapsibleSection>
	</div>
</template>

<style scoped>
.admin-failed-jobs--has-errors :deep(.insis-label) {
	color: var(--insis-danger);
}
</style>
