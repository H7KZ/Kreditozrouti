<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimetableStore } from '@client/stores'

interface Props {
	courseId: number
}

const props = defineProps<Props>()

const { t } = useI18n()
const timetableStore = useTimetableStore()

const selectedUnits = computed(() => timetableStore.unitsByCourse.get(props.courseId) ?? [])

const conflictingUnits = computed(() => {
	const allConflicts = [...timetableStore.conflicts, ...timetableStore.campusConflicts]
	return selectedUnits.value.filter((u) => allConflicts.some(([a, b]) => a.slotId === u.slotId || b.slotId === u.slotId))
})

const totalSelected = computed(() => selectedUnits.value.length)

const conflictCount = computed(() => conflictingUnits.value.length)

const status = computed(() => timetableStore.courseStatuses.get(props.courseId))

const isIncomplete = computed(() => status.value?.status === 'incomplete')

const hasConflict = computed(() => status.value?.status === 'conflict')

const hasCampusConflict = computed(() => status.value?.status === 'campus-conflict')
</script>

<template>
	<span v-if="totalSelected > 0" class="ml-1 inline-flex items-center gap-1">
		<!-- Conflict count badge -->
		<span
			v-if="hasConflict || hasCampusConflict"
			:class="[
				'inline-flex items-center rounded px-1 py-0.5 text-[10px] leading-none font-medium',
				hasConflict ? 'bg-(--insis-danger-light) text-(--insis-danger)' : 'bg-(--insis-warning-light) text-(--insis-warning)',
			]"
		>
			{{ conflictCount }}/{{ totalSelected }}
		</span>
		<!-- Incomplete pulsing dot -->
		<span
			v-else-if="isIncomplete"
			class="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400"
			:title="t('components.courses.CourseTable.missingUnitTypes')"
		/>
	</span>
</template>
