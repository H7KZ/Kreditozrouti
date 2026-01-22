<script setup lang="ts">
import type { Course, InSISDay } from '@client/types/courses'
import { WEEKDAYS } from '@client/types/courses'
import { computed } from 'vue'

const props = defineProps<{
	courses: Course[]
}>()

// Standard InSIS time slots
const TIME_SLOTS = [
	{ start: 450, end: 525, label: '7:30-8:45' },
	{ start: 555, end: 645, label: '9:15-10:45' },
	{ start: 660, end: 750, label: '11:00-12:30' },
	{ start: 765, end: 855, label: '12:45-14:15' },
	{ start: 870, end: 960, label: '14:30-16:00' },
	{ start: 975, end: 1065, label: '16:15-17:45' },
	{ start: 1080, end: 1170, label: '18:00-19:30' },
]

interface TimetableSlot {
	course: Course
	unitId: number
	type: string
	location: string
	lecturer: string
	rowSpan: number
}

// Build timetable data structure
const timetableData = computed(() => {
	const data: Record<InSISDay, Record<number, TimetableSlot[]>> = {
		Po: {},
		Út: {},
		St: {},
		Čt: {},
		Pá: {},
		So: {},
		Ne: {},
	}

	for (const course of props.courses) {
		if (!course.units?.length) continue

		for (const unit of course.units) {
			if (!unit.slots?.length) continue

			for (const slot of unit.slots) {
				if (!slot.day || slot.time_from === null || slot.time_to === null) continue

				const day = slot.day as InSISDay
				if (!WEEKDAYS.includes(day)) continue

				// Find which time slot this falls into
				const timeSlotIndex = TIME_SLOTS.findIndex((ts) => slot.time_from! >= ts.start && slot.time_from! < ts.end)

				if (timeSlotIndex === -1) continue

				if (!data[day][timeSlotIndex]) {
					data[day][timeSlotIndex] = []
				}

				// Calculate row span based on duration
				const duration = slot.time_to - slot.time_from
				const rowSpan = Math.ceil(duration / 90) // 90 minutes per slot

				data[day][timeSlotIndex].push({
					course,
					unitId: unit.id,
					type: slot.type ?? '',
					location: slot.location ?? '',
					lecturer: unit.lecturer ?? '',
					rowSpan,
				})
			}
		}
	}

	return data
})

function getSlotClass(type: string): string {
	const lowerType = type.toLowerCase()
	if (lowerType.includes('př') || lowerType.includes('lecture')) {
		return 'lecture'
	}
	if (lowerType.includes('cv') || lowerType.includes('seminar')) {
		return 'seminar'
	}
	return 'exercise'
}

function hasSlot(day: InSISDay, slotIndex: number): boolean {
	return !!timetableData.value[day][slotIndex]?.length
}

function getSlots(day: InSISDay, slotIndex: number): TimetableSlot[] {
	return timetableData.value[day][slotIndex] ?? []
}
</script>

<template>
	<div class="timetable-preview-wrapper">
		<div v-if="courses.length === 0" class="text-center py-8 text-[var(--insis-gray-600)]">Vyberte předměty pro zobrazení v rozvrhu.</div>

		<div v-else class="overflow-x-auto">
			<table class="insis-timetable">
				<thead>
					<tr>
						<th class="day-header">Den</th>
						<th v-for="slot in TIME_SLOTS" :key="slot.start" class="text-center">
							{{ slot.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="day in WEEKDAYS" :key="day">
						<th class="day-header">{{ day }}</th>
						<td v-for="(slot, index) in TIME_SLOTS" :key="slot.start" class="time-slot p-0">
							<div
								v-for="item in getSlots(day, index)"
								:key="`${item.course.id}-${item.unitId}`"
								class="insis-course-block"
								:class="getSlotClass(item.type)"
								:title="`${item.course.ident} - ${item.course.title}\n${item.lecturer}\n${item.location}`"
							>
								<div class="insis-course-block-title">
									{{ item.course.ident }}
								</div>
								<div class="insis-course-block-info">
									{{ item.type }}
								</div>
								<div class="insis-course-block-info">
									{{ item.location }}
								</div>
							</div>
							<div v-if="!hasSlot(day, index)" class="h-full min-h-[50px]"></div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Legend -->
		<div class="insis-legend mt-4">
			<span class="insis-legend-title">Legenda</span>
			<div class="insis-legend-content">
				<div class="insis-legend-item">
					<span class="w-4 h-4 bg-[var(--insis-block-lecture)] border border-[#6cb66c]"></span>
					<span>Přednáška</span>
				</div>
				<div class="insis-legend-item">
					<span class="w-4 h-4 bg-[var(--insis-block-seminar)] border border-[#7bf180]"></span>
					<span>Cvičení</span>
				</div>
				<div class="insis-legend-item">
					<span class="w-4 h-4 bg-[var(--insis-block-exercise)] border border-[#5bb8d9]"></span>
					<span>Seminář</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.time-slot {
	min-width: 100px;
	height: 60px;
	vertical-align: top;
	position: relative;
}

.insis-course-block {
	position: relative;
	margin: 2px;
	height: calc(100% - 4px);
}
</style>
