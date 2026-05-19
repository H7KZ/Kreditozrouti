<script setup lang="ts">
import type { MergedUnit } from '@client/composables'
import { isMergedUnit, useCourseLabels, useSlotMerging, useTimetableDrag, useTimetableGrid } from '@client/composables'
import { WEEKDAYS } from '@client/constants/timetable'
import { useDragStore, useTimetableStore } from '@client/stores'
import type { SelectedCourseUnit } from '@client/types'
import type { InSISDay } from '@shared/domain/insis'
import { ref, toRef } from 'vue'

/*
 * TimetableGrid
 * Weekly timetable grid displaying selected courses.
 * Supports drag-to-filter interaction.
 * Merges one-time (date-only) blocks on the same day of week.
 * Refactored to use composables for grid calculations.
 */

const timetableStore = useTimetableStore()
const dragStore = useDragStore()

// Composables
const { getShortDayLabel } = useCourseLabels()

// Slot merging composable
const { mergedUnitsByDay } = useSlotMerging(toRef(() => timetableStore.unitsByDay))

const { timeSlots, rowHeight, getBlockStyle, getTimeFromX, getDragSelectionStyle } = useTimetableGrid(
	toRef(() => mergedUnitsByDay.value),
	{
		rowHeight: 60,
		blockPadding: 2,
	},
)

// Drag handling
const gridRef = ref<HTMLElement | null>(null)

const { handleMouseDown, handleDragFilter, handleDragCancel } = useTimetableDrag(gridRef, getTimeFromX)

/**
 * Get units for a specific day (with merging applied)
 */
function getMergedUnitsForDay(day: InSISDay): (SelectedCourseUnit | MergedUnit)[] {
	return mergedUnitsByDay.value.get(day) || []
}

// Check if a unit has a hard time conflict
function hasConflict(unit: SelectedCourseUnit | MergedUnit): boolean {
	if (isMergedUnit(unit)) {
		return unit.mergedSlotIds.some((slotId) => timetableStore.conflicts.some(([a, b]) => a.slotId === slotId || b.slotId === slotId))
	}
	return timetableStore.conflicts.some(([a, b]) => a.slotId === unit.slotId || b.slotId === unit.slotId)
}

// Check if a unit has a campus travel-time conflict (softer, orange)
function hasCampusConflict(unit: SelectedCourseUnit | MergedUnit): boolean {
	if (isMergedUnit(unit)) {
		return unit.mergedSlotIds.some((slotId) => timetableStore.campusConflicts.some(([a, b]) => a.slotId === slotId || b.slotId === slotId))
	}
	return timetableStore.campusConflicts.some(([a, b]) => a.slotId === unit.slotId || b.slotId === unit.slotId)
}

// Course modal state
const showCourseModal = ref(false)
const selectedModalUnit = ref<SelectedCourseUnit | null>(null)

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

// Computed drag selection style wrapper
function getDragSelectionStyleForDay(day: InSISDay) {
	return getDragSelectionStyle(day, dragStore.normalizedDragSelection, dragStore.dragSelection.active)
}
</script>

<template>
	<div ref="gridRef" class="relative overflow-x-auto">
		<table class="insis-timetable w-full">
			<!-- Header with time slots -->
			<thead>
				<tr>
					<th class="w-[50px] min-w-[50px] bg-[var(--insis-header-bg)] text-center align-middle">
						{{ $t('components.timetable.TimetableGrid.dayHeader') }}
					</th>
					<th v-for="slot in timeSlots" :key="slot.minutes" class="text-center align-middle whitespace-nowrap px-2" :style="{ minWidth: '80px' }">
						{{ slot.label }}
					</th>
				</tr>
			</thead>

			<!-- Body with days and course blocks -->
			<tbody>
				<tr v-for="day in WEEKDAYS" :key="day" class="day-row-container">
					<!-- Day label -->
					<td class="w-[50px] min-w-[50px] font-medium bg-[var(--insis-surface)] border-r border-[var(--insis-border)] text-center align-middle">
						{{ getShortDayLabel(day) }}
					</td>

					<!-- Time grid cell spanning all columns -->
					<td
						:colspan="timeSlots.length"
						class="day-row cursor-crosshair hover:bg-[var(--insis-gray-50)] relative p-0"
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
						<template v-if="getDragSelectionStyleForDay(day) as Record<string, string> | null">
							<div
								class="pointer-events-none absolute top-0 bottom-0 bg-[var(--insis-block-selected)] opacity-50"
								:style="getDragSelectionStyleForDay(day)!"
							/>
						</template>

						<!-- Course blocks (positioned horizontally) - using merged units -->
						<TimetableCourseBlock
							v-for="unit in getMergedUnitsForDay(day)"
							:key="isMergedUnit(unit) ? `merged-${unit.slotId}` : unit.slotId"
							:unit="unit"
							:style="getBlockStyle(unit, day)"
							:has-conflict="hasConflict(unit)"
							:has-campus-conflict="hasCampusConflict(unit)"
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
			v-if="dragStore.showDragPopover"
			:position="dragStore.dragPopoverPosition"
			:selection="dragStore.normalizedDragSelection"
			@filter="handleDragFilter"
			@cancel="handleDragCancel"
		/>

		<!-- Course details modal -->
		<TimetableCourseModal v-if="showCourseModal && selectedModalUnit" :unit="selectedModalUnit" @close="handleCloseModal" />

		<slot />
	</div>
</template>
