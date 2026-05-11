<script setup lang="ts">
import type { AdminStatsResponse } from '@api/Controllers/Admin/AdminStatsController'

const props = defineProps<{
	database: AdminStatsResponse['database']
}>()

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleString()
}

function ageColor(avgAgeHours: number): string {
	if (avgAgeHours < 24) return 'var(--insis-success)'
	if (avgAgeHours <= 72) return 'var(--insis-warning)'
	return 'var(--insis-danger)'
}
</script>

<template>
	<!-- Totals Row -->
	<div class="grid grid-cols-3 gap-4 mb-4">
		<div class="insis-card p-4 text-center">
			<div class="text-2xl font-bold text-[var(--insis-text)]">{{ props.database.totals.courses }}</div>
			<div class="text-sm mt-1 text-[var(--insis-text-2)]">Total Courses</div>
		</div>
		<div class="insis-card p-4 text-center">
			<div class="text-2xl font-bold text-[var(--insis-text)]">{{ props.database.totals.studyPlans }}</div>
			<div class="text-sm mt-1 text-[var(--insis-text-2)]">Study Plans</div>
		</div>
		<div class="insis-card p-4 text-center">
			<div class="text-2xl font-bold text-[var(--insis-text)]">{{ props.database.totals.faculties }}</div>
			<div class="text-sm mt-1 text-[var(--insis-text-2)]">Faculties</div>
		</div>
	</div>

	<!-- Faculty Freshness Table -->
	<div class="insis-card mb-4">
		<div class="p-3 font-semibold border-b border-[var(--insis-border)] text-[var(--insis-text)]">Faculty Freshness</div>
		<div class="overflow-x-auto">
			<table class="insis-table insis-table-dense w-full">
				<thead>
					<tr>
						<th>Faculty</th>
						<th>Courses</th>
						<th>Avg Age</th>
						<th>Oldest</th>
						<th>Newest</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="faculty in props.database.facultyBreakdown" :key="faculty.facultyId">
						<td>{{ faculty.facultyTitle ?? faculty.facultyId }}</td>
						<td>{{ faculty.courseCount }}</td>
						<td :style="{ color: ageColor(faculty.avgAgeHours) }">{{ faculty.avgAgeHours }}h</td>
						<td>{{ formatDate(faculty.oldestUpdatedAt) }}</td>
						<td>{{ formatDate(faculty.newestUpdatedAt) }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Stale Progress Bars -->
	<div class="insis-card mb-4">
		<div class="p-3 font-semibold border-b border-[var(--insis-border)] text-[var(--insis-text)]">Stale Courses</div>
		<div class="p-4 flex flex-col gap-3">
			<div v-for="stale in props.database.staleCourses" :key="stale.thresholdDays" class="flex items-center gap-3">
				<span class="w-32 text-sm shrink-0 text-[var(--insis-text-2)]">Stale &gt; {{ stale.thresholdDays }} days</span>
				<progress class="flex-1" :max="props.database.totals.courses" :value="stale.count" style="accent-color: var(--insis-danger)" />
				<span class="text-sm w-10 text-right shrink-0 text-[var(--insis-text-2)]">{{ stale.count }}</span>
			</div>
		</div>
	</div>

	<!-- Recently Updated -->
	<div class="text-sm text-[var(--insis-text-2)]">{{ props.database.recentlyUpdated }} courses updated in the last 24 hours</div>
</template>
