<script setup lang="ts">
import type { ShareableUnit } from '@shared/http/share'
import type { SelectedCourseUnit } from '@client/types'
import type { InSISDay } from '@shared/domain/insis'
import { computed, toRef } from 'vue'
import { isMergedUnit, useSlotMerging } from '@client/composables/useSlotMerging'
import { useTimetableGrid } from '@client/composables/useTimetableGrid'
import { useCourseLabels } from '@client/composables/useCourseLabels'
import { WEEKDAYS } from '@client/constants/timetable'
import TimetableCourseBlock from './TimetableCourseBlock.vue'

const props = defineProps<{ units: ShareableUnit[] }>()

const { getShortDayLabel } = useCourseLabels()

// cast is safe — ShareableUnit is structurally identical to SelectedCourseUnit
const unitsByDay = computed(() => {
	const map = new Map<InSISDay, SelectedCourseUnit[]>()
	for (const u of props.units) {
		if (!u.day) continue
		const day = u.day as InSISDay
		if (!map.has(day)) map.set(day, [])
		map.get(day)!.push(u as unknown as SelectedCourseUnit)
	}
	return map
})

const { mergedUnitsByDay } = useSlotMerging(toRef(unitsByDay))
const { timeSlots, getBlockStyle, rowHeight, rowHeightPerDay } = useTimetableGrid(mergedUnitsByDay)

function getMergedUnitsForDay(day: InSISDay) {
	return mergedUnitsByDay.value.get(day) ?? []
}
</script>

<template>
	<div class="overflow-x-auto rounded-md border border-(--insis-border)">
		<table class="w-full border-collapse" style="table-layout: fixed">
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
			<tbody>
				<tr v-for="day in WEEKDAYS" :key="day" class="day-row-container">
					<td
						class="sticky left-0 z-10 w-[50px] min-w-[50px] border-r border-(--insis-border) bg-(--insis-surface) text-center align-middle font-medium"
					>
						{{ getShortDayLabel(day) }}
					</td>
					<td :colspan="timeSlots.length" class="day-row relative p-0" :style="{ height: `${rowHeightPerDay.get(day) ?? rowHeight}px` }">
						<!-- Background grid lines -->
						<div class="pointer-events-none absolute inset-0 flex">
							<div
								v-for="(slot, idx) in timeSlots"
								:key="slot.minutes"
								class="h-full w-full border-r border-(--insis-border-light)"
								:class="{ 'border-r-0': idx === timeSlots.length - 1 }"
							/>
						</div>

						<TimetableCourseBlock
							v-for="unit in getMergedUnitsForDay(day)"
							:key="isMergedUnit(unit) ? `merged-${unit.slotId}` : unit.slotId"
							:unit="unit"
							:style="getBlockStyle(unit, day)"
							:has-conflict="false"
							:has-campus-conflict="false"
							:is-merged="isMergedUnit(unit)"
							:merged-count="isMergedUnit(unit) ? unit.mergedCount : undefined"
							:date-range="isMergedUnit(unit) ? unit.dateRange : undefined"
							:read-only="true"
						/>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
