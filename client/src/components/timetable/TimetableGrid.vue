<script setup lang="ts">
import type { MergedUnit } from '@client/composables'
import type { SelectedCourseUnit } from '@client/types'
import type { InSISDay } from '@shared/domain/insis'
import { ref, toRef } from 'vue'
import TimetableCourseBlock from '@client/components/timetable/TimetableCourseBlock.vue'
import TimetableCourseModal from '@client/components/timetable/TimetableCourseModal.vue'
import TimetableDragPopover from '@client/components/timetable/TimetableDragPopover.vue'
import { isMergedUnit, useCourseLabels, useScheduleExport, useSlotMerging, useTimetableDrag, useTimetableGrid } from '@client/composables'
import { WEEKDAYS } from '@client/constants/timetable'
import { useDragStore, useTimetableStore } from '@client/stores'

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

const { exportSchedule, exporting } = useScheduleExport(gridRef)

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
	<div class="relative">
		<div class="mb-2 flex justify-end">
			<button
				type="button"
				v-if="timetableStore.selectedUnits.length > 0"
				:disabled="exporting"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8 disabled:opacity-50"
				@click="exportSchedule"
			>
				<svg v-if="!exporting" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M21 12a9 9 0 1 1-6.219-8.56" />
				</svg>
				{{ exporting ? 'Exportuji...' : 'Uložit jako obrázek' }}
			</button>
		</div>
		<div ref="gridRef" class="overflow-x-auto">
			<table class="insis-timetable w-full">
				<!-- Header with time slots -->
				<thead>
					<tr>
						<th class="sticky left-0 z-10 w-[50px] min-w-[50px] bg-(--insis-header-bg) text-center align-middle">
							{{ $t('components.timetable.TimetableGrid.dayHeader') }}
						</th>
						<th v-for="slot in timeSlots" :key="slot.minutes" class="px-2 text-center align-middle whitespace-nowrap" :style="{ minWidth: '80px' }">
							{{ slot.label }}
						</th>
					</tr>
				</thead>

				<!-- Body with days and course blocks -->
				<tbody>
					<tr v-for="day in WEEKDAYS" :key="day" class="day-row-container">
						<!-- Day label -->
						<td
							class="sticky left-0 z-10 w-[50px] min-w-[50px] border-r border-(--insis-border) bg-(--insis-surface) text-center align-middle font-medium"
						>
							{{ getShortDayLabel(day) }}
						</td>

						<!-- Time grid cell spanning all columns -->
						<td
							:colspan="timeSlots.length"
							class="day-row relative cursor-crosshair p-0 hover:bg-(--insis-gray-50)"
							:style="{ height: `${rowHeight}px` }"
							:data-day="day"
							@mousedown="handleMouseDown($event, day)"
						>
							<!-- Background grid lines (every hour) -->
							<div class="pointer-events-none absolute inset-0 flex">
								<div
									v-for="(slot, idx) in timeSlots"
									:key="slot.minutes"
									class="h-full w-full border-r border-(--insis-border-light)"
									:class="{
										'border-r-0': idx === timeSlots.length - 1,
									}"
								/>
							</div>

							<!-- Drag selection overlay (horizontal) -->
							<template v-if="getDragSelectionStyleForDay(day) as Record<string, string> | null">
								<div
									class="pointer-events-none absolute top-0 bottom-0 bg-(--insis-block-selected) opacity-50"
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
		</div>

		<!-- Right-edge scroll affordance -->
		<div class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-(--insis-surface) to-transparent" />

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
