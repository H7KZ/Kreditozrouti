<script setup lang="ts">
import { useTimeUtils } from '@client/composables'
import { CourseUnitType, SelectedCourseUnit } from '@client/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconX from '~icons/lucide/x'

/*
 * TimetableCourseBlock
 * Renders a single course block on the timetable grid.
 * Color-coded by unit type, shows course info and remove action.
 */

const { t, te } = useI18n({ useScope: 'global' })
const { minutesToTime } = useTimeUtils()

interface Props {
	unit: SelectedCourseUnit
	hasConflict?: boolean
}

interface Emits {
	(e: 'remove'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** Background color based on unit type */
const blockColorClass = computed(() => {
	if (props.unit.date) {
		return 'bg-[var(--insis-block-date-only)]'
	}

	const typeColors: Record<CourseUnitType, string> = {
		lecture: 'bg-[var(--insis-block-lecture)]',
		exercise: 'bg-[var(--insis-block-exercise)]',
		seminar: 'bg-[var(--insis-block-seminar)]',
	}
	return typeColors[props.unit.unitType] || 'bg-[var(--insis-block-lecture)]'
})

/** Formatted time range */
const timeRange = computed(() => `${minutesToTime(props.unit.timeFrom)}-${minutesToTime(props.unit.timeTo)}`)

/** Unit type label */
const typeLabel = computed(() => {
	const key = `unitTypesShort.${props.unit.unitType}`
	return te(key) ? t(key) : props.unit.unitType
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
				<span v-if="unit.location" class="truncate text-[var(--insis-gray-500)]">
					{{ unit.location }}
				</span>
			</div>

			<!-- Remove button (shown on hover) -->
			<button
				type="button"
				class="remove-btn cursor-pointer absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded bg-[var(--insis-danger-light)] text-white hover:bg-[var(--insis-danger)]"
				:title="$t('components.timetable.TimetableCourseBlock.removeFromTimetable')"
				@click="handleRemove"
			>
				<IconX class="h-3 w-3" />
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
