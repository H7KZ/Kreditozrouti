<script setup lang="ts">
import type { ScheduledCourse } from '@client/types/schedule'
import { computed } from 'vue'

const props = defineProps<{
	scheduledCourses: ScheduledCourse[]
	totalCredits: number
	totalHours: number
}>()

const emit = defineEmits<{
	'remove-course': [courseId: number, timeSlotIndex: number]
	'clear-schedule': []
	'export-schedule': []
}>()

// Group by unique courses
const courseGroups = computed(() => {
	const groups = new Map<number, { course: ScheduledCourse['course']; slots: ScheduledCourse[]; color: string }>()

	props.scheduledCourses.forEach((sc) => {
		if (!groups.has(sc.course.id)) {
			groups.set(sc.course.id, { course: sc.course, slots: [], color: sc.color })
		}
		groups.get(sc.course.id)!.slots.push(sc)
	})

	return Array.from(groups.values())
})

const uniqueCoursesCount = computed(() => courseGroups.value.length)
</script>

<template>
	<aside class="insis-card flex flex-col h-full">
		<!-- Header -->
		<div class="insis-card-header insis-card-header-success">
			<h3 class="insis-card-title">Můj rozvrh</h3>
		</div>

		<!-- Stats -->
		<div class="flex justify-around py-3 px-4 border-b border-gray-200" style="background: var(--insis-success-light)">
			<div class="text-center">
				<span class="block text-xl font-bold" style="color: var(--insis-success)">{{ uniqueCoursesCount }}</span>
				<span class="text-xs text-gray-500">předmětů</span>
			</div>
			<div class="text-center">
				<span class="block text-xl font-bold" style="color: var(--insis-success)">{{ totalCredits }}</span>
				<span class="text-xs text-gray-500">kreditů</span>
			</div>
			<div class="text-center">
				<span class="block text-xl font-bold" style="color: var(--insis-success)">{{ totalHours.toFixed(1) }}h</span>
				<span class="text-xs text-gray-500">týdně</span>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto insis-scrollbar">
			<!-- Empty state -->
			<div v-if="!courseGroups.length" class="p-4 text-center text-gray-500">
				<p>Zatím nemáte žádné předměty.</p>
				<p class="text-sm">Přidejte předměty ze seznamu.</p>
			</div>

			<!-- Course list -->
			<div v-else class="p-2 space-y-2">
				<div v-for="group in courseGroups" :key="group.course.id" class="bg-gray-50 rounded p-2 border-l-4" :style="{ borderLeftColor: group.color }">
					<div class="flex justify-between items-center mb-1">
						<span class="text-sm font-mono font-semibold text-gray-700">{{ group.course.ident }}</span>
						<span class="text-xs text-gray-500">{{ group.course.ects }} kr.</span>
					</div>
					<div class="text-sm text-gray-800 truncate mb-2">{{ group.course.title }}</div>
					<div class="space-y-1">
						<div
							v-for="sc in group.slots"
							:key="sc.timeSlotIndex"
							class="flex items-center gap-2 text-xs bg-white px-2 py-1 rounded border border-gray-200"
						>
							<span>Termín {{ sc.timeSlotIndex + 1 }}</span>
							<button
								@click="emit('remove-course', sc.course.id, sc.timeSlotIndex)"
								class="ml-auto w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
							>
								×
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div v-if="courseGroups.length" class="p-3 border-t border-gray-200 flex gap-2">
			<button @click="emit('export-schedule')" class="insis-btn insis-btn-success flex-1">Exportovat</button>
			<button @click="emit('clear-schedule')" class="insis-btn insis-btn-danger flex-1">Vymazat</button>
		</div>
	</aside>
</template>
