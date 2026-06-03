<script setup lang="ts">
import type { CourseStatusType } from '@client/types'
import { computed } from 'vue'
import { useSharedCourseStatusFilter } from '@client/composables/useCourseStatusFilter'
import { useTimetableStore } from '@client/stores'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconBookOpen from '~icons/lucide/book-open'
import IconCalendarX from '~icons/lucide/calendar-x'
import IconCheck from '~icons/lucide/check'
import IconMapPin from '~icons/lucide/map-pin'

/**
 * CourseStatusSummary
 *
 * Displays course status counts in a prominent location above the view tabs.
 * Shows:
 * - Total selected courses (with success indicator if complete)
 * - Conflict count (with warning/error indicator)
 * - Incomplete count (with warning indicator)
 *
 * Clicking on a status badge filters the course list to show those courses.
 */

const timetableStore = useTimetableStore()

const { statusCounts, totalSelectedCount, toggleStatusFilter, isStatusSelected, clearFilters, isFiltering } = useSharedCourseStatusFilter()

/** Whether all selections are complete (no conflicts or incomplete) */
const isAllComplete = computed(
	() =>
		totalSelectedCount.value > 0 && statusCounts.value.conflict === 0 && statusCounts.value['campus-conflict'] === 0 && statusCounts.value.incomplete === 0,
)

/** Whether there are issues to address */
const hasIssues = computed(() => statusCounts.value.conflict > 0 || statusCounts.value['campus-conflict'] > 0 || statusCounts.value.incomplete > 0)

/** Total ECTS of selected courses */
const totalEcts = computed(() => {
	let total = 0
	for (const unit of timetableStore.selectedUnits) {
		if (unit.ects && !timetableStore.selectedUnits.some((u) => u.courseId === unit.courseId && u.slotId < unit.slotId)) {
			total += unit.ects
		}
	}
	return total
})

/** Handle badge click - toggle filter for that status */
function handleBadgeClick(status: CourseStatusType) {
	toggleStatusFilter(status)
}

/** Get badge classes based on selection state */
function getBadgeClasses(status: CourseStatusType, baseClass: string): string {
	const isSelected = isStatusSelected(status)
	if (isSelected) {
		return `${baseClass} ring-2 ring-offset-1 ring-(--insis-blue)`
	}
	return baseClass
}
</script>

<template>
	<div v-if="totalSelectedCount > 0" class="py-2">
		<div class="flex flex-wrap items-center gap-2">
			<!-- Selected courses badge -->
			<button
				type="button"
				:class="[
					'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-solid px-2.5 py-1 text-xs font-medium transition-all duration-150 focus:outline-none active:scale-[0.98]',
					getBadgeClasses(
						'selected',
						isAllComplete
							? 'border-(--insis-success-border) bg-(--insis-success-light) text-(--insis-success) hover:brightness-95'
							: 'border-(--insis-blue-lighter) bg-(--insis-blue-subtle) text-(--insis-blue) hover:bg-(--insis-blue-light)',
					),
				]"
				:title="$t('components.courses.CourseStatusSummary.selectedTooltip')"
				@click="handleBadgeClick('selected')"
			>
				<IconCheck v-if="isAllComplete" class="h-3.5 w-3.5" />
				<IconBookOpen v-else class="h-3.5 w-3.5" />
				<span>
					{{ $t('components.courses.CourseStatusSummary.selectedCourses', { count: totalSelectedCount }) }}
				</span>
			</button>

			<!-- ECTS total (non-interactive) -->
			<span v-if="totalEcts > 0" class="border-l border-(--insis-border) px-2 text-xs text-(--insis-gray-500)"> {{ totalEcts }} ECTS </span>

			<!-- Divider when there are issues -->
			<span v-if="hasIssues" class="text-(--insis-gray-300)">|</span>

			<!-- Conflict warning badge -->
			<button
				v-if="statusCounts.conflict > 0"
				type="button"
				:class="[
					'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-solid px-2.5 py-1 text-xs font-medium transition-all duration-150 focus:outline-none active:scale-[0.98]',
					getBadgeClasses('conflict', 'border-(--insis-danger-border) bg-(--insis-danger-light) text-(--insis-danger) hover:brightness-95'),
				]"
				:title="$t('components.courses.CourseStatusSummary.conflictTooltip')"
				@click="handleBadgeClick('conflict')"
			>
				<IconCalendarX class="h-3.5 w-3.5" />
				<span>
					{{ $t('components.courses.CourseStatusSummary.conflicts', { count: statusCounts.conflict }) }}
				</span>
			</button>

			<!-- Campus conflict warning badge (orange) -->
			<button
				v-if="statusCounts['campus-conflict'] > 0"
				type="button"
				:class="[
					'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-solid px-2.5 py-1 text-xs font-medium transition-all duration-150 focus:outline-none active:scale-[0.98]',
					getBadgeClasses('campus-conflict', 'border-(--insis-warning-border) bg-(--insis-warning-light) text-(--insis-warning) hover:brightness-95'),
				]"
				:title="$t('components.courses.CourseStatusSummary.campusConflictTooltip')"
				@click="handleBadgeClick('campus-conflict')"
			>
				<IconMapPin class="h-3.5 w-3.5" />
				<span>
					{{ $t('components.courses.CourseStatusSummary.campusConflicts', { count: statusCounts['campus-conflict'] }) }}
				</span>
			</button>

			<!-- Incomplete warning badge -->
			<button
				v-if="statusCounts.incomplete > 0"
				type="button"
				:class="[
					'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-solid px-2.5 py-1 text-xs font-medium transition-all duration-150 focus:outline-none active:scale-[0.98]',
					getBadgeClasses('incomplete', 'border-(--insis-warning-border) bg-(--insis-warning-light) text-(--insis-warning) hover:brightness-95'),
				]"
				:title="$t('components.courses.CourseStatusSummary.incompleteTooltip')"
				@click="handleBadgeClick('incomplete')"
			>
				<IconAlertTriangle class="h-3.5 w-3.5" />
				<span>
					{{ $t('components.courses.CourseStatusSummary.incomplete', { count: statusCounts.incomplete }) }}
				</span>
			</button>

			<!-- Clear filter indicator -->
			<button v-if="isFiltering" type="button" class="ml-2 text-xs text-(--insis-blue) hover:underline" @click="clearFilters">
				{{ $t('common.clearFilter') }}
			</button>
		</div>

		<!-- Success message when all complete -->
		<p v-if="isAllComplete" class="mt-1 text-xs text-(--insis-success)">
			<IconCheck class="mr-0.5 inline h-3 w-3" />
			{{ $t('components.courses.CourseStatusSummary.allComplete') }}
		</p>
	</div>
</template>
