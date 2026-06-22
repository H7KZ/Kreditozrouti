<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimetableStore } from '@client/stores'

interface Props {
	course: CourseWithRelationsDTO
}

const props = defineProps<Props>()

const { t } = useI18n()
const timetableStore = useTimetableStore()

const selectedUnits = computed(() => timetableStore.unitsByCourse.get(props.course.id) ?? [])
const totalSelected = computed(() => selectedUnits.value.length)
const isSelected = computed(() => totalSelected.value > 0)

const status = computed(() => timetableStore.courseStatuses.get(props.course.id))

const hasConflict = computed(() => status.value?.status === 'conflict')
const hasCampusConflict = computed(() => status.value?.status === 'campus-conflict')
const isIncomplete = computed(() => status.value?.status === 'incomplete')

const conflictingUnits = computed(() => {
	const allConflicts = [...timetableStore.conflicts, ...timetableStore.campusConflicts]
	return selectedUnits.value.filter(u => allConflicts.some(([a, b]) => a.slotId === u.slotId || b.slotId === u.slotId))
})
const conflictCount = computed(() => conflictingUnits.value.length)

/** Any unit of this unselected course would hard-conflict with the current timetable. */
const hasPotentialConflict = computed(
	() => !isSelected.value && (props.course.units?.some(u => timetableStore.unitHasConflicts(u)) ?? false)
)

/** Any unit of this unselected course would campus-conflict (but not hard-conflict) with the current timetable. */
const hasPotentialCampusConflict = computed(
	() =>
		!isSelected.value &&
		!hasPotentialConflict.value &&
		(props.course.units?.some(u => !timetableStore.unitHasConflicts(u) && timetableStore.unitHasCampusConflicts(u)) ?? false)
)
</script>

<template>
	<!-- In timetable, no issues -->
	<span v-if="isSelected && status?.status === 'selected'" class="insis-badge insis-badge-success shrink-0">
		{{ t('components.courses.CourseTable.inTimetable') }}
	</span>

	<!-- Hard conflict: X/Y count badge -->
	<span
		v-if="hasConflict"
		class="inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[10px] font-medium leading-none bg-(--insis-danger-light) text-(--insis-danger)"
	>
		{{ conflictCount }}/{{ totalSelected }}
	</span>

	<!-- Campus conflict (selected) -->
	<span v-else-if="hasCampusConflict" class="insis-badge insis-badge-amber shrink-0">
		{{ t('components.courses.CourseTable.campusConflictTag') }}
	</span>

	<!-- Incomplete selection: pulsing dot -->
	<span
		v-else-if="isIncomplete"
		class="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400"
		:title="t('components.courses.CourseTable.missingUnitTypes')"
	/>

	<!-- Potential hard conflict (unselected) -->
	<span v-if="hasPotentialConflict" class="insis-badge insis-badge-danger shrink-0">
		{{ t('components.courses.CourseTable.conflictTag') }}
	</span>

	<!-- Potential campus conflict (unselected) -->
	<span v-else-if="hasPotentialCampusConflict" class="insis-badge insis-badge-amber shrink-0">
		{{ t('components.courses.CourseTable.campusConflictTag') }}
	</span>
</template>
