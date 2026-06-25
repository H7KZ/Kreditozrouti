<script setup lang="ts">
import type { MergedUnit } from '@client/composables'
import { isMergedUnit, useCourseLabels, useScheduleExport, useShareTimetable, useSlotMerging, useTimetableDrag, useTimetableGrid } from '@client/composables'
import type { SelectedCourseUnit } from '@client/types'
import type { Day } from '@shared/domain/constants'
import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import TimetableAgenda from '@client/components/timetable/TimetableAgenda.vue'
import TimetableCourseBlock from '@client/components/timetable/TimetableCourseBlock.vue'
import TimetableCourseModal from '@client/components/timetable/TimetableCourseModal.vue'
import TimetableDragPopover from '@client/components/timetable/TimetableDragPopover.vue'
import ICalExportDialog from '@client/components/timetable/ICalExportDialog.vue'
import { WEEKDAYS } from '@client/constants/timetable'
import { useAlertsStore, useDragStore, useTimetableStore } from '@client/stores'
import IconCalendarDown from '~icons/lucide/calendar-arrow-down'
import IconDownload from '~icons/lucide/download'
import IconLoaderCircle from '~icons/lucide/loader-circle'
import IconShare2 from '~icons/lucide/share-2'

const props = withDefaults(
	defineProps<{
		/** External units to display. When provided, store units are ignored. */
		units?: SelectedCourseUnit[]
		/** Show the share button in the toolbar. */
		showShare?: boolean
		/** Show the export-to-image button in the toolbar. */
		showExport?: boolean
		/** Enable drag-to-filter interaction on the grid. */
		enableDrag?: boolean
		/** Open the course detail modal when a block is clicked. */
		enableCourseModal?: boolean
	}>(),
	{ units: undefined, showShare: true, showExport: true, enableDrag: true, enableCourseModal: true }
)

/*
 * TimetableGrid
 * Weekly timetable grid displaying selected courses.
 * Supports drag-to-filter interaction.
 * Merges one-time (date-only) blocks on the same day of week.
 * Refactored to use composables for grid calculations.
 */

const { t } = useI18n()
const timetableStore = useTimetableStore()
const dragStore = useDragStore()
const alertsStore = useAlertsStore()

// Composables
const { getShortDayLabel } = useCourseLabels()

// Slot merging composable — use external units when in readOnly mode, otherwise fall back to store
const { mergedUnitsByDay } = useSlotMerging(
	computed(() => {
		if (props.units) {
			const map = new Map<Day, SelectedCourseUnit[]>()
			for (const u of props.units) {
				if (!u.day) continue
				if (!map.has(u.day)) map.set(u.day, [])
				map.get(u.day)!.push(u)
			}
			return map
		}
		return timetableStore.unitsByDay
	})
)

const { timeSlots, rowHeight, rowHeightPerDay, getBlockStyle, getTimeFromX, getDragSelectionStyle } = useTimetableGrid(
	toRef(() => mergedUnitsByDay.value),
	{
		rowHeight: 60,
		blockPadding: 2
	}
)

// Drag handling
const gridRef = ref<HTMLElement | null>(null)

const { handleMouseDown, handleDragFilter, handleDragCancel } = useTimetableDrag(gridRef, getTimeFromX)

const { exportSchedule, exporting } = useScheduleExport(gridRef)
const { sharing, shareTimetable } = useShareTimetable()
const showICalDialog = ref(false)

async function handleShare() {
	const url = await shareTimetable(timetableStore.selectedUnits)
	if (url) {
		alertsStore.addAlert({ type: 'success', title: t('components.timetable.TimetableGrid.shareCopied'), timeout: 4000 })
	} else if (!sharing.value) {
		alertsStore.addAlert({ type: 'error', title: t('components.timetable.TimetableGrid.shareError'), timeout: 6000 })
	}
}

/**
 * Get units for a specific day (with merging applied)
 */
function getMergedUnitsForDay(day: Day): (SelectedCourseUnit | MergedUnit)[] {
	return mergedUnitsByDay.value.get(day) || []
}

// Check if a unit has a hard time conflict
function hasConflict(unit: SelectedCourseUnit | MergedUnit): boolean {
	if (props.units) return false
	if (isMergedUnit(unit)) {
		return unit.mergedSlotIds.some(slotId => timetableStore.conflicts.some(([a, b]) => a.slotId === slotId || b.slotId === slotId))
	}
	return timetableStore.conflicts.some(([a, b]) => a.slotId === unit.slotId || b.slotId === unit.slotId)
}

// Check if a unit has a campus travel-time conflict (softer, orange)
function hasCampusConflict(unit: SelectedCourseUnit | MergedUnit): boolean {
	if (props.units) return false
	if (isMergedUnit(unit)) {
		return unit.mergedSlotIds.some(slotId => timetableStore.campusConflicts.some(([a, b]) => a.slotId === slotId || b.slotId === slotId))
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
function getDragSelectionStyleForDay(day: Day) {
	return getDragSelectionStyle(day, dragStore.normalizedDragSelection, dragStore.dragSelection.active)
}
</script>

<template>
	<div class="relative">
		<!-- Mobile: agenda view -->
		<TimetableAgenda class="lg:hidden" :units="units" :show-share="showShare" :show-export="showExport" :enable-course-modal="enableCourseModal" />

		<!-- Desktop: time grid -->
		<div class="hidden flex-col gap-2 lg:flex">
			<div v-if="(showShare || showExport) && timetableStore.selectedUnits.length > 0" class="flex justify-end gap-2">
				<!-- Share button -->
				<button
					v-if="showShare"
					type="button"
					:disabled="sharing"
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8 disabled:cursor-not-allowed disabled:opacity-50"
					@click="handleShare"
				>
					<IconShare2 v-if="!sharing" class="h-3.5 w-3.5" aria-hidden="true" />
					<IconLoaderCircle v-else class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
					{{ sharing ? $t('components.timetable.TimetableGrid.sharing') : $t('components.timetable.TimetableGrid.share') }}
				</button>

				<!-- Export to image button -->
				<button
					v-if="showExport"
					type="button"
					:disabled="exporting"
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8 disabled:cursor-not-allowed disabled:opacity-50"
					@click="exportSchedule"
				>
					<IconDownload v-if="!exporting" class="h-3.5 w-3.5" aria-hidden="true" />
					<IconLoaderCircle v-else class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
					{{ exporting ? $t('components.timetable.TimetableAgenda.exporting') : $t('components.timetable.TimetableAgenda.saveAsImage') }}
				</button>

				<!-- Export to calendar button -->
				<button
					v-if="showExport"
					type="button"
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8"
					@click="showICalDialog = true"
				>
					<IconCalendarDown class="h-3.5 w-3.5" aria-hidden="true" />
					{{ $t('components.timetable.TimetableGrid.exportToCalendar') }}
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
							<th
								v-for="slot in timeSlots"
								:key="slot.minutes"
								class="px-2 text-center align-middle whitespace-nowrap"
								:style="{ minWidth: '80px' }"
							>
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
								:class="enableDrag ? 'day-row relative cursor-crosshair p-0 hover:bg-(--insis-gray-50)' : 'day-row relative p-0'"
								:style="{ height: `${rowHeightPerDay.get(day) ?? rowHeight}px` }"
								:data-day="day"
								@mousedown="enableDrag && handleMouseDown($event, day)"
							>
								<!-- Background grid lines (every hour) -->
								<div class="pointer-events-none absolute inset-0 flex">
									<div
										v-for="(slot, idx) in timeSlots"
										:key="slot.minutes"
										class="h-full w-full border-r border-(--insis-border-light)"
										:class="{
											'border-r-0': idx === timeSlots.length - 1
										}"
									/>
								</div>

								<!-- Drag selection overlay (horizontal) -->
								<template v-if="enableDrag && (getDragSelectionStyleForDay(day) as Record<string, string> | null)">
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
									:read-only="!enableCourseModal"
									@click="enableCourseModal && handleCourseBlockClick(unit)"
									@remove="handleRemoveUnit(unit)"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Drag-to-filter popover -->
			<TimetableDragPopover
				v-if="enableDrag && dragStore.showDragPopover"
				:position="dragStore.dragPopoverPosition"
				:selection="dragStore.normalizedDragSelection"
				@filter="handleDragFilter"
				@cancel="handleDragCancel"
			/>

			<!-- Course details modal -->
			<TimetableCourseModal v-if="enableCourseModal && showCourseModal && selectedModalUnit" :unit="selectedModalUnit" @close="handleCloseModal" />

			<slot />
		</div>

		<ICalExportDialog v-model="showICalDialog" :units="units ?? timetableStore.selectedUnits" />
	</div>
</template>
