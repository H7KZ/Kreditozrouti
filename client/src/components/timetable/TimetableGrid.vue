<script setup lang="ts">
import TimetableCourseBlock from '@client/components/timetable/TimetableCourseBlock.vue'
import TimetableCourseModal from '@client/components/timetable/TimetableCourseModal.vue'
import TimetableDragPopover from '@client/components/timetable/TimetableDragPopover.vue'
import { useCourseLabels, useTimetableGrid } from '@client/composables'
import { WEEKDAYS } from '@client/constants/timetable'
import { useCoursesStore, useTimetableStore, useUIStore } from '@client/stores'
import type { SelectedCourseUnit } from '@client/types'
import type InSISDay from '@scraper/Types/InSISDay'
import { computed, onMounted, onUnmounted, ref, toRef } from 'vue'

/*
 * TimetableGrid
 * Weekly timetable grid displaying selected courses.
 * Supports drag-to-filter interaction.
 * Merges one-time (date-only) blocks on the same day of week.
 * Refactored to use composables for grid calculations.
 */

const timetableStore = useTimetableStore()
const coursesStore = useCoursesStore()
const uiStore = useUIStore()

// Composables
const { getShortDayLabel } = useCourseLabels()
const { timeSlots, rowHeight, getBlockStyle, getTimeFromX, getDragSelectionStyle } = useTimetableGrid(
	toRef(() => mergedUnitsByDay.value),
	{
		rowHeight: 60,
		blockPadding: 2,
	},
)

/**
 * Represents a merged block containing multiple one-time slots
 */
interface MergedUnit extends SelectedCourseUnit {
	isMerged: boolean
	mergedCount: number
	mergedSlotIds: number[]
	dateRange: string
	originalUnits: SelectedCourseUnit[]
}

/**
 * Merge one-time blocks that fall on the same day of the week,
 * have the same course, same time, and same unit type.
 */
const mergedUnitsByDay = computed(() => {
	const result = new Map<InSISDay, (SelectedCourseUnit | MergedUnit)[]>()

	for (const day of WEEKDAYS) {
		result.set(day, [])
	}

	// Get original units by day
	const originalByDay = timetableStore.unitsByDay

	for (const day of WEEKDAYS) {
		const dayUnits = originalByDay.get(day) || []
		const processedSlotIds = new Set<number>()
		const mergedUnits: (SelectedCourseUnit | MergedUnit)[] = []

		for (const unit of dayUnits) {
			// Skip if already processed
			if (processedSlotIds.has(unit.slotId)) continue

			// If this is a weekly recurring slot (no date), add as-is
			if (!unit.date) {
				mergedUnits.push(unit)
				processedSlotIds.add(unit.slotId)
				continue
			}

			// This is a one-time (date-only) slot - find others to merge with
			const mergeCandidates = dayUnits.filter(
				(other) =>
					!processedSlotIds.has(other.slotId) &&
					other.date && // Must also be one-time
					other.courseId === unit.courseId &&
					other.unitType === unit.unitType &&
					other.timeFrom === unit.timeFrom &&
					other.timeTo === unit.timeTo,
			)

			if (mergeCandidates.length <= 1) {
				// No other candidates, add as-is
				mergedUnits.push(unit)
				processedSlotIds.add(unit.slotId)
				continue
			}

			// Merge the candidates
			const dates = mergeCandidates
				.map((u) => u.date!)
				.sort((a, b) => {
					// Sort dates (DD.MM.YYYY format)
					const [dA, mA, yA] = a.split('.').map(Number)
					const [dB, mB, yB] = b.split('.').map(Number)
					if (yA !== yB) return yA! - yB!
					if (mA !== mB) return mA! - mB!
					return dA! - dB!
				})

			// Create date range string
			const dateRange = dates.length > 2 ? `${dates[0]} - ${dates[dates.length - 1]}` : dates.join(', ')

			const mergedUnit: MergedUnit = {
				...unit,
				isMerged: true,
				mergedCount: mergeCandidates.length,
				mergedSlotIds: mergeCandidates.map((u) => u.slotId),
				dateRange,
				originalUnits: mergeCandidates,
			}

			mergedUnits.push(mergedUnit)

			// Mark all merged slots as processed
			for (const candidate of mergeCandidates) {
				processedSlotIds.add(candidate.slotId)
			}
		}

		result.set(day, mergedUnits)
	}

	return result
})

/**
 * Get units for a specific day (with merging applied)
 */
function getMergedUnitsForDay(day: InSISDay): (SelectedCourseUnit | MergedUnit)[] {
	return mergedUnitsByDay.value.get(day) || []
}

/**
 * Check if a unit is merged
 */
function isMergedUnit(unit: SelectedCourseUnit | MergedUnit): unit is MergedUnit {
	return 'isMerged' in unit && unit.isMerged
}

// Check if a unit has a conflict
function hasConflict(unit: SelectedCourseUnit | MergedUnit): boolean {
	if (isMergedUnit(unit)) {
		// Check if any of the merged slots have conflicts
		return unit.mergedSlotIds.some((slotId) => timetableStore.conflicts.some(([a, b]) => a.slotId === slotId || b.slotId === slotId))
	}
	return timetableStore.conflicts.some(([a, b]) => a.slotId === unit.slotId || b.slotId === unit.slotId)
}

// Drag handling
const gridRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartX = ref(0)

// Course modal state
const showCourseModal = ref(false)
const selectedModalUnit = ref<SelectedCourseUnit | null>(null)

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
function handleCourseBlockClick(unit: SelectedCourseUnit | MergedUnit) {
	// If merged, use the first original unit for the modal
	if (isMergedUnit(unit)) {
		selectedModalUnit.value = unit.originalUnits[0] || unit
	} else {
		selectedModalUnit.value = unit
	}
	showCourseModal.value = true
}

// Handle closing the course modal
function handleCloseModal() {
	showCourseModal.value = false
	selectedModalUnit.value = null
}

// Handle removing a unit (or all merged units)
function handleRemoveUnit(unit: SelectedCourseUnit | MergedUnit) {
	if (isMergedUnit(unit)) {
		// Remove all merged units
		for (const original of unit.originalUnits) {
			timetableStore.removeUnit(original.unitId)
		}
	} else {
		timetableStore.removeUnit(unit.unitId)
	}
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

// Computed drag selection style wrapper
function getDragSelectionStyleForDay(day: InSISDay) {
	return getDragSelectionStyle(day, timetableStore.normalizedDragSelection, timetableStore.dragSelection.active)
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
						:style="{ height: `${rowHeight}px` }"
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
							v-if="getDragSelectionStyleForDay(day)"
							class="pointer-events-none absolute top-0 bottom-0 bg-[var(--insis-block-selected)] opacity-50"
							:style="getDragSelectionStyleForDay(day)!"
						/>

						<!-- Course blocks (positioned horizontally) - using merged units -->
						<TimetableCourseBlock
							v-for="unit in getMergedUnitsForDay(day)"
							:key="isMergedUnit(unit) ? `merged-${unit.slotId}` : unit.slotId"
							:unit="unit"
							:style="getBlockStyle(unit, day)"
							:has-conflict="hasConflict(unit)"
							:is-merged="isMergedUnit(unit)"
							:merged-count="isMergedUnit(unit) ? unit.mergedCount : undefined"
							:date-range="isMergedUnit(unit) ? unit.dateRange : undefined"
							@click="handleCourseBlockClick(unit)"
							@remove="handleRemoveUnit(unit)"
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
