<script setup lang="ts">
import type { CourseUnitType, SelectedCourseUnit } from '@client/types'
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCourseLabels, useTimeUtils } from '@client/composables'
import { useCoursesStore, useTimetableStore } from '@client/stores'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconX from '~icons/lucide/x'

/*
 * TimetableCourseBlock
 * Renders a single course block on the timetable grid.
 * Color-coded by unit type, shows course info and remove action.
 * Shows warning icon when the course has missing unit types.
 */

const { t, te } = useI18n()
const { minutesToTime } = useTimeUtils()
const { getUnitCourseTitle } = useCourseLabels()
const timetableStore = useTimetableStore()
const coursesStore = useCoursesStore()

interface Props {
	unit: SelectedCourseUnit
	hasConflict?: boolean
	/** Whether this block has a campus travel-time conflict (softer warning, orange) */
	hasCampusConflict?: boolean
	/** Whether this block represents merged one-time slots */
	isMerged?: boolean
	/** Count of merged slots (for display) */
	mergedCount?: number
	/** Date range string for merged blocks */
	dateRange?: string
	/** Disables remove button and click interaction (used on share page) */
	readOnly?: boolean
}

interface Emits {
	(e: 'remove'): void
	(e: 'click'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** Helper to determine slot type from string */
function getSlotTypeFromString(type: string | null): CourseUnitType | null {
	if (!type) return null
	const t = type.toLowerCase()
	if (t.includes('přednáška') || t.includes('lecture')) return 'lecture'
	if (t.includes('cvičení') || t.includes('exercise')) return 'exercise'
	if (t.includes('seminář') || t.includes('seminar')) return 'seminar'
	return null
}

/** Check if course has missing unit types (needs action) */
const courseStatus = computed(() => {
	const courseUnits = timetableStore.getUnitsForCourse(props.unit.courseId)
	if (courseUnits.length === 0) return { needsAction: false, missingTypes: [] }

	// Find the full course from the courses store
	const fullCourse = coursesStore.courses.find((c: CourseWithRelationsDTO) => c.id === props.unit.courseId)
	if (!fullCourse) return { needsAction: false, missingTypes: [] }

	// Get all available unit types for this course
	const availableTypes = new Set<CourseUnitType>()
	for (const unit of fullCourse.units || []) {
		for (const slot of unit.slots || []) {
			const slotType = getSlotTypeFromString(slot.type)
			if (slotType) availableTypes.add(slotType)
		}
	}

	// Get selected unit types
	const selectedTypes = new Set(courseUnits.map(u => u.unitType))

	// Find missing types
	const missingTypes: CourseUnitType[] = []
	for (const type of availableTypes) {
		if (!selectedTypes.has(type)) {
			missingTypes.push(type)
		}
	}

	// If there are missing types AND we have at least one selected, needs action
	return {
		needsAction: missingTypes.length > 0 && selectedTypes.size > 0,
		missingTypes
	}
})

/** Background color based on unit type */
const blockColorClass = computed(() => {
	if (props.unit.date) {
		return 'bg-(--insis-block-date-only)'
	}

	const typeColors: Record<CourseUnitType, string> = {
		lecture: 'bg-(--insis-block-lecture)',
		exercise: 'bg-(--insis-block-exercise)',
		seminar: 'bg-(--insis-block-seminar)'
	}
	return typeColors[props.unit.unitType] || 'bg-(--insis-block-lecture)'
})

/** Formatted time range */
const timeRange = computed(() => `${minutesToTime(props.unit.timeFrom)}-${minutesToTime(props.unit.timeTo)}`)

/** Unit type label */
const typeLabel = computed(() => {
	const key = `unitTypesShort.${props.unit.unitType}`
	return te(key) ? t(key) : props.unit.unitType
})

/** Warning tooltip text */
const warningTooltip = computed(() => {
	if (!courseStatus.value.needsAction) return ''

	const types = courseStatus.value.missingTypes
		.map(type => {
			const key = `unitTypes.${type}`
			return te(key) ? t(key) : type
		})
		.join(', ')

	return t('components.timetable.TimetableCourseBlock.missingTypesWarning', { types })
})

function handleRemove(event: MouseEvent) {
	event.stopPropagation()
	emit('remove')
}

function handleClick() {
	emit('click')
}
</script>

<template>
	<div
		class="timetable-block group absolute right-0 left-0 min-h-6 overflow-hidden border border-(--insis-border) text-xs text-gray-900 transition-shadow hover:z-10 hover:shadow-[0_2px_4px_rgba(0,0,0,0.15)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--insis-blue)"
		:class="[{ 'cursor-pointer': !readOnly, 'cursor-default': readOnly },
			blockColorClass,
			{
				'ring-2 ring-(--insis-danger)': hasConflict,
				'ring-2 ring-(--insis-warning)': hasCampusConflict && !hasConflict,
				'merged-block': isMerged
			}
		]"
		role="button"
		:tabindex="0"
		:aria-label="$t('components.timetable.TimetableCourseBlock.courseBlockLabel', { code: unit.courseIdent, type: typeLabel, time: timeRange })"
		@click="handleClick"
		@keydown.enter="handleClick"
		@keydown.space.prevent="handleClick"
	>
		<div class="flex h-full flex-col p-1">
			<!-- Course ident, type badge, and warning icon -->
			<div class="flex items-start justify-between gap-1">
				<div class="flex min-w-0 items-center gap-1">
					<!-- Warning icon for missing unit types -->
					<span
						v-if="courseStatus.needsAction"
						class="warning-indicator flex shrink-0 items-center justify-center rounded-full text-(--insis-danger)"
						:title="warningTooltip"
						aria-hidden="true"
					>
						<IconAlertTriangle class="h-3 w-3" />
					</span>
					<span class="truncate font-medium">
						{{ unit.courseIdent }}
					</span>
				</div>
				<div class="flex items-center gap-0.5">
					<!-- Merged count badge -->
					<span
						v-if="isMerged && mergedCount && mergedCount > 1"
						class="shrink-0 rounded bg-white/70 px-1 text-[10px] font-medium text-gray-900"
						:title="$t('components.timetable.TimetableCourseBlock.mergedSlots', { count: mergedCount })"
					>
						×{{ mergedCount }}
					</span>
					<span class="shrink-0 rounded bg-white/50 px-1 text-[10px] font-medium text-gray-900">
						{{ typeLabel }}
					</span>
				</div>
			</div>

			<!-- Course title (truncated) -->
			<div class="mt-0.5 flex-1 truncate text-[10px] text-gray-600">
				{{ getUnitCourseTitle(unit) }}
			</div>

			<!-- Lecturer name -->
			<p v-if="!isMerged && unit.lecturer" class="mt-0.5 shrink-0 truncate text-[10px] opacity-70">
				{{ unit.lecturer }}
			</p>

			<!-- Time and room / date range for merged -->
			<div class="mt-auto flex items-end justify-between gap-1 text-[10px]">
				<span class="text-gray-500">
					{{ timeRange }}
				</span>
				<span v-if="dateRange" class="truncate text-gray-500" :title="dateRange">
					{{ dateRange }}
				</span>
				<span v-else-if="unit.location" class="truncate text-gray-500">
					{{ unit.location }}
				</span>
			</div>

			<!-- Remove button (shown on hover/focus, hidden in read-only mode) -->
			<button
				v-if="!readOnly"
				type="button"
				class="absolute top-0.5 right-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded bg-(--insis-danger-light) text-(--insis-danger) opacity-0 transition-all duration-75 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-(--insis-danger) hover:text-white focus:opacity-100 focus:ring-1 focus:ring-(--insis-danger) focus:outline-none"
				:aria-label="$t('components.timetable.TimetableCourseBlock.removeFromTimetable')"
				@click="handleRemove"
			>
				<IconX class="h-3 w-3" aria-hidden="true" />
			</button>
		</div>
	</div>
</template>

<style scoped>
.warning-indicator {
	animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.7;
	}
}

.merged-block {
	/* Subtle pattern to indicate merged blocks */
	background-image: repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255, 255, 255, 0.1) 3px, rgba(255, 255, 255, 0.1) 6px);
}
</style>
