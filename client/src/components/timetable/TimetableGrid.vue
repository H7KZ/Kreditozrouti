<script setup lang="ts">
/**
 * TimetableGrid
 * Weekly timetable grid displaying selected courses.
 * Supports drag-to-filter interaction.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
// import { useRouter } from 'vue-router'

import TimetableCourseBlock from '@client/components/timetable/TimetableCourseBlock.vue'
import TimetableDragPopover from '@client/components/timetable/TimetableDragPopover.vue'
import { useTimeUtils } from '@client/composables'
import { TIME_CONFIG, useCoursesStore, useTimetableStore, useUIStore, WEEKDAYS } from '@client/stores'
import { SelectedCourseUnit } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'

// const router = useRouter()
const timetableStore = useTimetableStore()
const coursesStore = useCoursesStore()
const uiStore = useUIStore()
const { minutesToTime, calculateTimePosition, calculateTimeDuration } = useTimeUtils()

// Time slots for the grid header
const timeSlots = computed(() => {
	const slots: Array<{ minutes: number; label: string }> = []
	let time = TIME_CONFIG.START

	// Generate time slots every hour for the header
	while (time < TIME_CONFIG.END) {
		slots.push({
			minutes: time,
			label: minutesToTime(time),
		})
		time += 60 // Every hour
	}

	return slots
})

// Grid cell height in pixels (per hour)
const CELL_HEIGHT = 60

// Total grid height
const gridHeight = computed(() => {
	const hours = (TIME_CONFIG.END - TIME_CONFIG.START) / 60
	return hours * CELL_HEIGHT
})

// Get units for a specific day
function getUnitsForDay(day: InSISDay): SelectedCourseUnit[] {
	return timetableStore.unitsByDay.get(day) || []
}

// Calculate position and size for a course block
function getBlockStyle(unit: SelectedCourseUnit) {
	const top = calculateTimePosition(unit.timeFrom, TIME_CONFIG.START, TIME_CONFIG.END)
	const height = calculateTimeDuration(unit.timeFrom, unit.timeTo, TIME_CONFIG.START, TIME_CONFIG.END)

	return {
		top: `${top}%`,
		height: `${height}%`,
	}
}

// Check if a unit has a conflict
function hasConflict(unit: SelectedCourseUnit): boolean {
	return timetableStore.conflicts.some(([a, b]) => a.slotId === unit.slotId || b.slotId === unit.slotId)
}

// Drag handling
const gridRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

function getTimeFromY(y: number, element: HTMLElement): number {
	const rect = element.getBoundingClientRect()
	const relativeY = y - rect.top
	const percentage = relativeY / rect.height
	const totalMinutes = TIME_CONFIG.END - TIME_CONFIG.START
	const minutes = TIME_CONFIG.START + percentage * totalMinutes

	// Snap to 15-minute intervals
	return Math.round(minutes / 15) * 15
}

function handleMouseDown(event: MouseEvent, day: InSISDay) {
	if (!gridRef.value) return

	const dayColumn = (event.target as HTMLElement).closest('.day-column') as HTMLElement
	if (!dayColumn) return

	const time = getTimeFromY(event.clientY, dayColumn)
	timetableStore.startDrag(day, time)
	isDragging.value = true

	event.preventDefault()
}

function handleMouseMove(event: MouseEvent) {
	if (!isDragging.value || !gridRef.value) return

	const dayColumn = document.elementFromPoint(event.clientX, event.clientY)?.closest('.day-column') as HTMLElement
	if (!dayColumn) return

	const day = dayColumn.dataset.day as InSISDay
	const time = getTimeFromY(event.clientY, dayColumn)
	timetableStore.updateDrag(day, time)
}

function handleMouseUp(event: MouseEvent) {
	if (!isDragging.value) return

	isDragging.value = false
	timetableStore.endDrag(event.clientX, event.clientY)
}

// Handle drag filter action
async function handleDragFilter() {
	const selection = timetableStore.getDragSelectionValues()
	if (!selection) return

	// Apply the time filter
	coursesStore.setTimeFilterFromDrag(selection.day, selection.timeFrom, selection.timeTo)

	// Switch to list view
	uiStore.switchToListView()

	// Fetch courses
	await coursesStore.fetchCourses()

	// Close popover
	timetableStore.cancelDrag()
}

// Handle drag cancel
function handleDragCancel() {
	timetableStore.cancelDrag()
}

// Check if a time slot is in the drag selection
// function isInDragSelection(day: InSISDay, time: number): boolean {
// 	return timetableStore.isInDragSelection(day, time)
// }

// Get drag selection style for a day column
function getDragSelectionStyle(day: InSISDay) {
	const selection = timetableStore.normalizedDragSelection
	if (!selection || selection.day !== day || !timetableStore.dragSelection.active) {
		return null
	}

	const top = calculateTimePosition(selection.timeFrom, TIME_CONFIG.START, TIME_CONFIG.END)
	const height = calculateTimeDuration(selection.timeFrom, selection.timeTo, TIME_CONFIG.START, TIME_CONFIG.END)

	return {
		top: `${top}%`,
		height: `${height}%`,
	}
}

// Global mouse event listeners
onMounted(() => {
	document.addEventListener('mousemove', handleMouseMove)
	document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
	document.removeEventListener('mousemove', handleMouseMove)
	document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
	<div ref="gridRef" class="relative overflow-x-auto">
		<table class="insis-timetable">
			<!-- Header with time slots -->
			<thead>
				<tr>
					<th class="day-header">Den</th>
					<th v-for="slot in timeSlots" :key="slot.minutes" class="text-center">
						{{ slot.label }}
					</th>
				</tr>
			</thead>

			<!-- Body with days and time slots -->
			<tbody>
				<tr v-for="day in WEEKDAYS" :key="day">
					<!-- Day label -->
					<td class="day-header font-medium">
						{{ day.substring(0, 2) }}
					</td>

					<!-- Time grid cell spanning all columns -->
					<td
						:colspan="timeSlots.length"
						class="day-column relative p-0"
						:style="{ height: `${gridHeight}px` }"
						:data-day="day"
						@mousedown="handleMouseDown($event, day)"
					>
						<!-- Background grid lines (every hour) -->
						<div class="pointer-events-none absolute inset-0">
							<div
								v-for="slot in timeSlots"
								:key="slot.minutes"
								class="absolute top-0 h-full border-l border-[var(--insis-border-light)]"
								:style="{
									left: `${calculateTimePosition(slot.minutes, TIME_CONFIG.START, TIME_CONFIG.END)}%`,
								}"
							/>
						</div>

						<!-- Drag selection overlay -->
						<div
							v-if="getDragSelectionStyle(day)"
							class="pointer-events-none absolute left-0 right-0 bg-[var(--insis-block-selected)] opacity-50"
							:style="getDragSelectionStyle(day)"
						/>

						<!-- Course blocks -->
						<TimetableCourseBlock
							v-for="unit in getUnitsForDay(day)"
							:key="unit.slotId"
							:unit="unit"
							:style="getBlockStyle(unit)"
							:has-conflict="hasConflict(unit)"
							@remove="timetableStore.removeUnit(unit.slotId)"
						/>
					</td>
				</tr>
			</tbody>
		</table>

		<!-- Drag-to-filter popover -->
		<TimetableDragPopover
			v-if="timetableStore.showDragPopover"
			:position="timetableStore.dragPopoverPosition"
			:selection="timetableStore.normalizedDragSelection"
			@filter="handleDragFilter"
			@cancel="handleDragCancel"
		/>
	</div>
</template>

<style scoped>
.day-column {
	cursor: crosshair;
}

.day-column:hover {
	background-color: var(--insis-gray-50);
}
</style>
