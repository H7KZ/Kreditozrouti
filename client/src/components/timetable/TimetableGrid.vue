<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TimetableCourseBlock from '@client/components/timetable/TimetableCourseBlock.vue'
import TimetableDragPopover from '@client/components/timetable/TimetableDragPopover.vue'
import { useTimeUtils } from '@client/composables'
import { TIME_CONFIG, useAlertsStore, useCoursesStore, useTimetableStore, useUIStore, WEEKDAYS } from '@client/stores'
import { SelectedCourseUnit } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'

/*
 * TimetableGrid
 * Weekly timetable grid displaying selected courses.
 * Supports drag-to-filter interaction.
 *
 * Layout: X-axis = time, Y-axis = days
 * Course blocks span horizontally based on their time range
 */

const { t, te } = useI18n({ useScope: 'global' })
const timetableStore = useTimetableStore()
const coursesStore = useCoursesStore()
const uiStore = useUIStore()
const alertsStore = useAlertsStore()
const { minutesToTime, calculateTimePosition, calculateTimeDuration } = useTimeUtils()

// Time slots for the grid header (every hour)
const timeSlots = computed(() => {
	const slots: Array<{ minutes: number; label: string }> = []
	let time = TIME_CONFIG.START

	while (time <= TIME_CONFIG.END) {
		slots.push({
			minutes: time,
			label: minutesToTime(time),
		})
		time += 60 // Every hour
	}

	return slots
})

// Row height in pixels
const ROW_HEIGHT = 60

// Get units for a specific day
function getUnitsForDay(day: InSISDay): SelectedCourseUnit[] {
	return timetableStore.unitsByDay.get(day) || []
}

// Calculate horizontal position and width for a course block (X-axis = time)
function getBlockStyle(unit: SelectedCourseUnit) {
	const left = calculateTimePosition(unit.timeFrom, TIME_CONFIG.START, TIME_CONFIG.END)
	const width = calculateTimeDuration(unit.timeFrom, unit.timeTo, TIME_CONFIG.START, TIME_CONFIG.END)

	return {
		left: `${left}%`,
		width: `${width}%`,
		top: '2px',
		bottom: '2px',
	}
}

// Check if a unit has a conflict
function hasConflict(unit: SelectedCourseUnit): boolean {
	return timetableStore.conflicts.some(([a, b]) => a.slotId === unit.slotId || b.slotId === unit.slotId)
}

// Get translated day name
function getDayLabel(day: InSISDay): string {
	const key = `days.${day}`
	return te(key) ? t(key) : day
}

// Get short day label (first 2 chars of translated name)
function getShortDayLabel(day: InSISDay): string {
	const key = `daysShort.${day}`
	return te(key) ? t(key) : day.substring(0, 2)
}

// Drag handling
const gridRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartX = ref(0)

function getTimeFromX(x: number, element: HTMLElement): number {
	const rect = element.getBoundingClientRect()
	const relativeX = x - rect.left
	const percentage = relativeX / rect.width
	const totalMinutes = TIME_CONFIG.END - TIME_CONFIG.START
	const minutes = TIME_CONFIG.START + percentage * totalMinutes

	// Snap to 15-minute intervals
	return Math.max(TIME_CONFIG.START, Math.min(TIME_CONFIG.END, Math.round(minutes / 15) * 15))
}

function handleMouseDown(event: MouseEvent, day: InSISDay) {
	if (!gridRef.value) return

	// Don't start drag if clicking on a course block
	const target = event.target as HTMLElement
	if (target.closest('.timetable-block')) return

	const dayRow = (event.target as HTMLElement).closest('.day-row') as HTMLElement
	if (!dayRow) return

	const time = getTimeFromX(event.clientX, dayRow)
	timetableStore.startDrag(day, time)
	isDragging.value = true
	dragStartX.value = event.clientX

	event.preventDefault()
}

function handleMouseMove(event: MouseEvent) {
	if (!isDragging.value || !gridRef.value) return

	const dayRow = document.elementFromPoint(event.clientX, event.clientY)?.closest('.day-row') as HTMLElement
	if (!dayRow) return

	const day = dayRow.dataset.day as InSISDay
	const time = getTimeFromX(event.clientX, dayRow)
	timetableStore.updateDrag(day, time)
}

function handleMouseUp(event: MouseEvent) {
	if (!isDragging.value) return

	isDragging.value = false

	// Check if it was a click (minimal movement) - require at least 20px drag
	const dragDistance = Math.abs(event.clientX - dragStartX.value)
	if (dragDistance < 20) {
		timetableStore.cancelDrag()
		return
	}

	timetableStore.endDrag(event.clientX, event.clientY)
}

// Handle clicking on a course block to filter by its time
function handleCourseBlockClick(unit: SelectedCourseUnit) {
	// Apply the time filter for this course's time slot
	coursesStore.setTimeFilterFromDrag(unit.day, unit.timeFrom, unit.timeTo)

	// Switch to list view
	uiStore.switchToListView()

	// Fetch courses
	coursesStore.fetchCourses()

	// Show info alert
	alertsStore.addAlert({
		type: 'info',
		title: t('components.timetable.TimetableGrid.filterApplied'),
		description: t('components.timetable.TimetableGrid.filterDescription', {
			from: minutesToTime(unit.timeFrom),
			to: minutesToTime(unit.timeTo),
			day: getDayLabel(unit.day),
		}),
		timeout: 5000,
	})
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

// Get drag selection style for a day row (horizontal selection)
function getDragSelectionStyle(day: InSISDay) {
	const selection = timetableStore.normalizedDragSelection
	if (!selection || selection.day !== day || !timetableStore.dragSelection.active) {
		return null
	}

	const left = calculateTimePosition(selection.timeFrom, TIME_CONFIG.START, TIME_CONFIG.END)
	const width = calculateTimeDuration(selection.timeFrom, selection.timeTo, TIME_CONFIG.START, TIME_CONFIG.END)

	return {
		left: `${left}%`,
		width: `${width}%`,
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
		<table class="insis-timetable w-full">
			<!-- Header with time slots -->
			<thead>
				<tr>
					<th class="day-header sticky left-0 z-10 bg-[var(--insis-header-bg)]">{{ $t('components.timetable.TimetableGrid.dayHeader') }}</th>
					<th v-for="slot in timeSlots" :key="slot.minutes" class="text-center whitespace-nowrap px-2" :style="{ minWidth: '80px' }">
						{{ slot.label }}
					</th>
				</tr>
			</thead>

			<!-- Body with days and course blocks -->
			<tbody>
				<tr v-for="day in WEEKDAYS" :key="day" class="day-row-container">
					<!-- Day label -->
					<td class="day-header font-medium sticky left-0 z-10 bg-white border-r border-[var(--insis-border)]">
						{{ getShortDayLabel(day) }}
					</td>

					<!-- Time grid cell spanning all columns -->
					<td
						:colspan="timeSlots.length"
						class="day-row relative p-0"
						:style="{ height: `${ROW_HEIGHT}px` }"
						:data-day="day"
						@mousedown="handleMouseDown($event, day)"
					>
						<!-- Background grid lines (every hour) -->
						<div class="pointer-events-none absolute inset-0 flex">
							<div
								v-for="(slot, idx) in timeSlots"
								:key="slot.minutes"
								class="h-full border-l border-[var(--insis-border-light)]"
								:class="{ 'border-l-0': idx === 0 }"
								:style="{ width: `${100 / (timeSlots.length - 1)}%` }"
							/>
						</div>

						<!-- Drag selection overlay (horizontal) -->
						<div
							v-if="getDragSelectionStyle(day)"
							class="pointer-events-none absolute top-0 bottom-0 bg-[var(--insis-block-selected)] opacity-50"
							:style="getDragSelectionStyle(day)"
						/>

						<!-- Course blocks (positioned horizontally) -->
						<TimetableCourseBlock
							v-for="unit in getUnitsForDay(day)"
							:key="unit.slotId"
							:unit="unit"
							:style="getBlockStyle(unit)"
							:has-conflict="hasConflict(unit)"
							@click="handleCourseBlockClick(unit)"
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
.day-row {
	cursor: crosshair;
}

.day-row:hover {
	background-color: var(--insis-gray-50);
}

.day-header {
	width: 50px;
	min-width: 50px;
}
</style>
