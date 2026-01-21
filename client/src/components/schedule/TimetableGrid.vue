<script setup lang="ts">
import { TIMETABLE_DAYS, TIMETABLE_TIME_SLOTS } from '@client/constants/schedule'
import type { Course, ScheduledCourse } from '@client/types/schedule'
import { computed } from 'vue'

const props = defineProps<{
	scheduledCourses: ScheduledCourse[]
	highlightedCourse?: Course | null
}>()

const emit = defineEmits<{
	'remove-course': [courseId: number, timeSlotIndex: number]
}>()

// Group scheduled courses by day for positioning
computed(() => {
	const byDay: Record<string, ScheduledCourse[]> = {}
	TIMETABLE_DAYS.forEach((d) => (byDay[d.key] = []))

	// This assumes course has time_slots array - adjust based on your Course type
	props.scheduledCourses.forEach((sc) => {
		// For now, we'll use a simplified approach
		// You'll need to adapt this based on how time_slots are structured in Course
		const day = TIMETABLE_DAYS[sc.timeSlotIndex % 5]?.key || 'Po'
		if (byDay[day]) byDay[day].push(sc)
	})

	return byDay
})

function handleRemove(sc: ScheduledCourse) {
	emit('remove-course', sc.course.id, sc.timeSlotIndex)
}
</script>

<template>
	<div class="insis-card">
		<!-- Header -->
		<div class="insis-card-header insis-card-header-primary">
			<h2 class="insis-card-title">Rozvrh předmětů</h2>
		</div>

		<!-- Timetable -->
		<div class="overflow-x-auto">
			<table class="w-full border-collapse min-w-[900px]">
				<!-- Time headers -->
				<thead>
					<tr>
						<th class="w-12 px-2 py-2 text-xs font-semibold text-center border border-gray-200" style="background: var(--insis-primary-light)">
							Den
						</th>
						<th
							v-for="slot in TIMETABLE_TIME_SLOTS"
							:key="slot.start"
							class="px-1 py-2 text-xs font-semibold text-center border border-gray-200 whitespace-nowrap min-w-[70px]"
							style="background: var(--insis-primary-light)"
						>
							{{ slot.label }}
						</th>
					</tr>
				</thead>

				<!-- Day rows -->
				<tbody>
					<tr v-for="day in TIMETABLE_DAYS" :key="day.key" class="h-20">
						<!-- Day label -->
						<td
							class="px-2 py-2 text-sm font-semibold text-center border border-gray-200"
							style="background: var(--insis-primary-light); color: var(--insis-primary-dark)"
						>
							{{ day.shortLabel }}
						</td>

						<!-- Time slots -->
						<td v-for="slot in TIMETABLE_TIME_SLOTS" :key="slot.start" class="border border-gray-200 bg-white hover:bg-gray-50 relative">
							<!-- Scheduled courses would be positioned here -->
							<!-- This is a simplified version - real implementation needs course time matching -->
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Scheduled courses overlay (simplified list view) -->
		<div v-if="scheduledCourses.length" class="p-4 border-t border-gray-200 bg-gray-50">
			<h3 class="text-sm font-semibold text-gray-700 mb-2">Zapsané předměty:</h3>
			<div class="flex flex-wrap gap-2">
				<div
					v-for="sc in scheduledCourses"
					:key="`${sc.course.id}-${sc.timeSlotIndex}`"
					class="insis-course-block flex items-center gap-2 pr-1"
					:style="{ backgroundColor: sc.color }"
				>
					<span class="text-xs font-semibold">{{ sc.course.ident }}</span>
					<span class="text-xs truncate max-w-[150px]">{{ sc.course.title }}</span>
					<button @click="handleRemove(sc)" class="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
						×
					</button>
				</div>
			</div>
		</div>

		<!-- Legend -->
		<div class="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">Kliknutím na předmět jej odstraníte z rozvrhu.</div>
	</div>
</template>
