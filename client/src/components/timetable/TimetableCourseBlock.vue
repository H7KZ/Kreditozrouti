<script setup lang="ts">
/**
 * TimetableCourseBlock
 * Renders a single course block on the timetable grid.
 * Color-coded by unit type, shows course info and remove action.
 */
import { useTimeUtils } from '@client/composables'
import { CourseUnitType, SelectedCourseUnit } from '@client/types'
import { computed } from 'vue'

interface Props {
	unit: SelectedCourseUnit
	hasConflict?: boolean
}

interface Emits {
	(e: 'remove'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { minutesToTime } = useTimeUtils()

/** Background color based on unit type */
const blockColorClass = computed(() => {
	const typeColors: Record<CourseUnitType, string> = {
		lecture: 'bg-[var(--insis-block-lecture)]',
		exercise: 'bg-[var(--insis-block-exercise)]',
		seminar: 'bg-[var(--insis-block-seminar)]',
		combined: 'bg-[var(--insis-block-combined,#c8e6c9)]',
	}
	return typeColors[props.unit.unitType] || 'bg-[var(--insis-block-lecture)]'
})

/** Formatted time range */
const timeRange = computed(() => `${minutesToTime(props.unit.timeFrom)}-${minutesToTime(props.unit.timeTo)}`)

/** Short day label (first 2 characters) */
// const dayLabel = computed(() => props.unit.day.substring(0, 2))

/** Unit type label in Czech */
const typeLabel = computed(() => {
	const labels: Record<CourseUnitType, string> = {
		lecture: 'Př',
		exercise: 'Cv',
		seminar: 'Se',
		combined: 'Př+Cv',
	}
	return labels[props.unit.unitType] || 'Př'
})

function handleRemove(event: MouseEvent) {
	event.stopPropagation()
	emit('remove')
}
</script>

<template>
	<div
		class="timetable-block absolute left-0 right-0 overflow-hidden border border-[var(--insis-border)] text-xs"
		:class="[blockColorClass, { 'ring-2 ring-[var(--insis-danger)]': hasConflict }]"
	>
		<div class="flex h-full flex-col p-1">
			<!-- Course ident and type badge -->
			<div class="flex items-start justify-between gap-1">
				<span class="truncate font-medium text-[var(--insis-text)]">
					{{ unit.courseIdent }}
				</span>
				<span class="shrink-0 rounded bg-white/50 px-1 text-[10px] font-medium">
					{{ typeLabel }}
				</span>
			</div>

			<!-- Course title (truncated) -->
			<div class="mt-0.5 flex-1 truncate text-[10px] text-[var(--insis-gray-600)]">
				{{ unit.courseTitle }}
			</div>

			<!-- Time and room -->
			<div class="mt-auto flex items-end justify-between gap-1 text-[10px]">
				<span class="text-[var(--insis-gray-500)]">
					{{ timeRange }}
				</span>
				<span v-if="unit.room" class="truncate text-[var(--insis-gray-500)]">
					{{ unit.room }}
				</span>
			</div>

			<!-- Remove button (shown on hover) -->
			<button
				type="button"
				class="remove-btn absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded bg-[var(--insis-danger)] text-white hover:bg-[var(--insis-danger-dark)]"
				title="Odebrat z rozvrhu"
				@click="handleRemove"
			>
				<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
</template>

<style scoped>
.timetable-block {
	cursor: pointer;
	min-height: 24px;
	transition: box-shadow 0.15s ease;
}

.timetable-block:hover {
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	z-index: 10;
}

.timetable-block:hover .remove-btn {
	display: flex;
}
</style>
