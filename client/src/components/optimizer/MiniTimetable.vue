<script setup lang="ts">
import type { SelectedCourseUnitDTO } from '@kreditozrouti/core/http/optimize'
import type { Day } from '@kreditozrouti/core/domain/constants'
import { WEEKDAYS } from '@client/constants/timetable'

const props = defineProps<{
	units: SelectedCourseUnitDTO[]
	highlightUnitIds?: number[]
}>()

const TIME_START = 7 * 60 // 07:00
const TIME_RANGE = 14 * 60 // 07:00–21:00 span

function unitsByDay(day: Day): SelectedCourseUnitDTO[] {
	return props.units.filter(u => u.day === day)
}

function blockStyle(unit: SelectedCourseUnitDTO): Record<string, string> {
	const left = ((unit.timeFrom - TIME_START) / TIME_RANGE) * 100
	const width = ((unit.timeTo - unit.timeFrom) / TIME_RANGE) * 100
	return {
		left: `${Math.max(0, left)}%`,
		width: `${Math.max(1, width)}%`
	}
}
</script>

<template>
	<div class="flex flex-col gap-0.5 py-1 select-none">
		<div v-for="day in WEEKDAYS" :key="day" class="flex items-center gap-1.5">
			<span class="w-4 shrink-0 text-[9px] font-medium text-(--insis-text-3) uppercase">
				{{ day.slice(0, 2) }}
			</span>
			<div class="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-(--insis-surface-2)">
				<div
					v-for="unit in unitsByDay(day)"
					:key="unit.unitId"
					class="absolute top-0 h-full rounded-sm"
					:class="highlightUnitIds?.includes(unit.unitId) ? 'bg-amber-400' : 'bg-(--insis-blue)'"
					:style="blockStyle(unit)"
				/>
			</div>
		</div>
	</div>
</template>
