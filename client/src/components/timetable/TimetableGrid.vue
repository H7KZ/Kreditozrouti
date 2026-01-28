<script setup lang="ts">
import TimetableCourseBlock from '@client/components/timetable/TimetableCourseBlock.vue'
import TimetableCourseModal from '@client/components/timetable/TimetableCourseModal.vue'
import TimetableDragPopover from '@client/components/timetable/TimetableDragPopover.vue'
import { useTimeUtils } from '@client/composables'
import { TIME_CONFIG, WEEKDAYS } from '@client/constants/timetable.ts'
import { useCoursesStore, useTimetableStore, useUIStore } from '@client/stores'
import { SelectedCourseUnit } from '@client/types'
import InSISDay from '@scraper/Types/InSISDay.ts'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

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
const BLOCK_PADDING = 2 // Padding from row edges in pixels

// Get units for a specific day
function getUnitsForDay(day: InSISDay): SelectedCourseUnit[] {
	return timetableStore.unitsByDay.get(day) || []
}

/**
 * Find overlapping groups of units within a day.
 * Returns a Map where each unit's slotId maps to its position info:
 * { index: position in overlap group, total: total overlapping blocks }
 */
function getOverlapInfo(day: InSISDay): Map<number, { index: number; total: number }> {
	const units = getUnitsForDay(day)
	const overlapMap = new Map<number, { index: number; total: number }>()

	if (units.length === 0) return overlapMap

	// Sort units by start time, then by end time
	const sortedUnits = [...units].sort((a, b) => {
		if (a.timeFrom !== b.timeFrom) return a.timeFrom - b.timeFrom
		return a.timeTo - b.timeTo
	})

	// Find all units that overlap with each unit
	for (const unit of sortedUnits) {
		const overlapping = sortedUnits.filter((other) => other.timeFrom < unit.timeTo && unit.timeFrom < other.timeTo)

		// Sort overlapping group consistently to assign stable indices
		overlapping.sort((a, b) => {
			if (a.timeFrom !== b.timeFrom) return a.timeFrom - b.timeFrom
			if (a.timeTo !== b.timeTo) return a.timeTo - b.timeTo
			return a.slotId - b.slotId
		})

		const index = overlapping.findIndex((u) => u.slotId === unit.slotId)
		overlapMap.set(unit.slotId, { index, total: overlapping.length })
	}

	return overlapMap
}

// Cache overlap info per day to avoid recalculating for each block
const overlapCache = computed(() => {
	const cache = new Map<InSISDay, Map<number, { index: number; total: number }>>()
	for (const day of WEEKDAYS) {
		cache.set(day, getOverlapInfo(day))
	}
	return cache
})

// Calculate horizontal position and width for a course block (X-axis = time)
// Now also handles vertical stacking for overlapping blocks
function getBlockStyle(unit: SelectedCourseUnit, day: InSISDay) {
	const left = calculateTimePosition(unit.timeFrom, TIME_CONFIG.START, TIME_CONFIG.END)
	const width = calculateTimeDuration(unit.timeFrom, unit.timeTo, TIME_CONFIG.START, TIME_CONFIG.END)

	// Get overlap info for this unit
	const dayOverlaps = overlapCache.value.get(day)
	const overlapInfo = dayOverlaps?.get(unit.slotId) ?? { index: 0, total: 1 }

	// Calculate vertical position within the row
	const availableHeight = ROW_HEIGHT - BLOCK_PADDING * 2
	const blockHeight = availableHeight / overlapInfo.total
	const topOffset = BLOCK_PADDING + overlapInfo.index * blockHeight

	return {
		left: `${left}%`,
		width: `${width}%`,
		top: `${topOffset}px`,
		height: `${blockHeight}px`,
	}
}

// Check if a unit has a conflict
function hasConflict(unit: SelectedCourseUnit): boolean {
	return timetableStore.conflicts.some(([a, b]) => a.slotId === unit.slotId || b.slotId === unit.slotId)
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

// Course modal state
const showCourseModal = ref(false)
const selectedModalUnit = ref<SelectedCourseUnit | null>(null)

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

// Handle clicking on a course block to open the course modal
function handleCourseBlockClick(unit: SelectedCourseUnit) {
	selectedModalUnit.value = unit
	showCourseModal.value = true
}

// Handle closing the course modal
function handleCloseModal() {
	showCourseModal.value = false
	selectedModalUnit.value = null
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
					<th class="day-header bg-[var(--insis-header-bg)]">{{ $t('components.timetable.TimetableGrid.dayHeader') }}</th>
					<th v-for="slot in timeSlots" :key="slot.minutes" class="text-center whitespace-nowrap px-2" :style="{ minWidth: '80px' }">
						{{ slot.label }}
					</th>
				</tr>
			</thead>

			<!-- Body with days and course blocks -->
			<tbody>
				<tr v-for="day in WEEKDAYS" :key="day" class="day-row-container">
					<!-- Day label -->
					<td class="day-header font-medium bg-white border-r border-[var(--insis-border)]">
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
								class="h-full w-full border-r border-[var(--insis-border-light)]"
								:class="{
									'border-r-0': idx === timeSlots.length - 1,
								}"
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
							:style="getBlockStyle(unit, day)"
							:has-conflict="hasConflict(unit)"
							@click="handleCourseBlockClick(unit)"
							@remove="timetableStore.removeUnit(unit.unitId)"
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

		<!-- Course details modal -->
		<TimetableCourseModal v-if="showCourseModal && selectedModalUnit" :unit="selectedModalUnit" @close="handleCloseModal" />

		<slot />
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
