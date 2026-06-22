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

// Count of selected units involved in hard conflicts
const hardConflictCount = computed(
	() => selectedUnits.value.filter(u => timetableStore.conflicts.some(([a, b]) => a.slotId === u.slotId || b.slotId === u.slotId)).length
)

// Count of selected units involved in campus conflicts
const campusConflictCount = computed(
	() => selectedUnits.value.filter(u => timetableStore.campusConflicts.some(([a, b]) => a.slotId === u.slotId || b.slotId === u.slotId)).length
)

// Potential conflicts for unselected courses
const totalUnits = computed(() => props.course.units?.length ?? 0)

const potentialConflictCount = computed(
	() => (!isSelected.value ? (props.course.units?.filter(u => timetableStore.unitHasConflicts(u)).length ?? 0) : 0)
)

const potentialCampusConflictCount = computed(
	() =>
		!isSelected.value
			? (props.course.units?.filter(u => !timetableStore.unitHasConflicts(u) && timetableStore.unitHasCampusConflicts(u)).length ?? 0)
			: 0
)

const hasPotentialConflict = computed(() => potentialConflictCount.value > 0)
const hasPotentialCampusConflict = computed(() => !hasPotentialConflict.value && potentialCampusConflictCount.value > 0)
</script>

<template>
	<!-- In timetable, no issues -->
	<span v-if="isSelected && status?.status === 'selected'" class="insis-badge insis-badge-success shrink-0">
		{{ t('components.courses.CourseTable.inTimetable') }}
	</span>

	<!-- Hard conflict: X/Y count badge (selected) -->
	<span
		v-if="hasConflict"
		class="inline-flex shrink-0 items-center rounded bg-(--insis-danger-light) px-1 py-0.5 text-[10px] font-medium leading-none text-(--insis-danger)"
	>
		{{ hardConflictCount }}/{{ totalSelected }}
	</span>

	<!-- Campus conflict: X/Y count badge (selected) -->
	<span
		v-else-if="hasCampusConflict"
		class="inline-flex shrink-0 items-center rounded bg-(--insis-warning-light) px-1 py-0.5 text-[10px] font-medium leading-none text-(--insis-warning)"
	>
		{{ campusConflictCount }}/{{ totalSelected }}
	</span>

	<!-- Incomplete selection: pulsing dot -->
	<span
		v-else-if="isIncomplete"
		class="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400"
		:title="t('components.courses.CourseTable.missingUnitTypes')"
	/>

	<!-- Potential hard conflict: X/Y count badge (unselected) -->
	<span
		v-if="hasPotentialConflict"
		class="inline-flex shrink-0 items-center rounded bg-(--insis-danger-light) px-1 py-0.5 text-[10px] font-medium leading-none text-(--insis-danger)"
	>
		{{ potentialConflictCount }}/{{ totalUnits }}
	</span>

	<!-- Potential campus conflict: X/Y count badge (unselected) -->
	<span
		v-else-if="hasPotentialCampusConflict"
		class="inline-flex shrink-0 items-center rounded bg-(--insis-warning-light) px-1 py-0.5 text-[10px] font-medium leading-none text-(--insis-warning)"
	>
		{{ potentialCampusConflictCount }}/{{ totalUnits }}
	</span>
</template>
