<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@kreditozrouti/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimetableStore } from '@client/stores'
import IconTriangleAlert from '~icons/lucide/triangle-alert'
import IconMapPin from '~icons/lucide/map-pin'
import IconCircleDashed from '~icons/lucide/circle-dashed'

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

const potentialConflictCount = computed(() => (!isSelected.value ? (props.course.units?.filter(u => timetableStore.unitHasConflicts(u)).length ?? 0) : 0))

const potentialCampusConflictCount = computed(() =>
	!isSelected.value ? (props.course.units?.filter(u => !timetableStore.unitHasConflicts(u) && timetableStore.unitHasCampusConflicts(u)).length ?? 0) : 0
)

const hasPotentialConflict = computed(() => potentialConflictCount.value > 0)
const hasPotentialCampusConflict = computed(() => !hasPotentialConflict.value && potentialCampusConflictCount.value > 0)
</script>

<template>
	<!-- In timetable, no issues -->
	<span v-if="isSelected && status?.status === 'selected'" class="insis-badge insis-badge-success shrink-0">
		{{ t('components.courses.CourseTable.inTimetable') }}
	</span>

	<!-- Hard conflict: X/Y count badge (selected). Icon + text (not color alone). -->
	<span
		v-if="hasConflict"
		class="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--insis-danger-light) px-2 py-1 text-[10px] leading-none font-medium text-(--insis-danger)"
		:aria-label="t('components.courses.CourseTable.conflictBadgeLabel', { count: hardConflictCount, total: totalSelected })"
	>
		<IconTriangleAlert class="h-2.5 w-2.5" aria-hidden="true" />
		<span aria-hidden="true">{{ hardConflictCount }}/{{ totalSelected }}</span>
	</span>

	<!-- Campus conflict: X/Y count badge (selected). Icon + text (not color alone). -->
	<span
		v-else-if="hasCampusConflict"
		class="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--insis-warning-light) px-2 py-1 text-[10px] leading-none font-medium text-(--insis-warning)"
		:aria-label="t('components.courses.CourseTable.campusConflictBadgeLabel', { count: campusConflictCount, total: totalSelected })"
	>
		<IconMapPin class="h-2.5 w-2.5" aria-hidden="true" />
		<span aria-hidden="true">{{ campusConflictCount }}/{{ totalSelected }}</span>
	</span>

	<!-- Incomplete selection: icon badge with an accessible name (not color/title alone). -->
	<span
		v-else-if="isIncomplete"
		role="img"
		class="inline-flex shrink-0 items-center text-(--insis-warning)"
		:aria-label="t('components.courses.CourseTable.missingUnitTypes')"
	>
		<IconCircleDashed class="h-3 w-3 animate-pulse" aria-hidden="true" />
	</span>

	<!-- Potential hard conflict: X/Y count badge (unselected). Icon + text. -->
	<span
		v-if="hasPotentialConflict"
		class="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--insis-danger-light) px-2 py-1 text-[10px] leading-none font-medium text-(--insis-danger)"
		:aria-label="t('components.courses.CourseTable.potentialConflictBadgeLabel', { count: potentialConflictCount, total: totalUnits })"
	>
		<IconTriangleAlert class="h-2.5 w-2.5" aria-hidden="true" />
		<span aria-hidden="true">{{ potentialConflictCount }}/{{ totalUnits }}</span>
	</span>

	<!-- Potential campus conflict: X/Y count badge (unselected). Icon + text. -->
	<span
		v-else-if="hasPotentialCampusConflict"
		class="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--insis-warning-light) px-2 py-1 text-[10px] leading-none font-medium text-(--insis-warning)"
		:aria-label="t('components.courses.CourseTable.potentialCampusConflictBadgeLabel', { count: potentialCampusConflictCount, total: totalUnits })"
	>
		<IconMapPin class="h-2.5 w-2.5" aria-hidden="true" />
		<span aria-hidden="true">{{ potentialCampusConflictCount }}/{{ totalUnits }}</span>
	</span>
</template>
