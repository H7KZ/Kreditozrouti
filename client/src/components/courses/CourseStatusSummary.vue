<script setup lang="ts">
import { useSharedCourseStatusFilter } from '@client/composables/useCourseStatusFilter'
import { useTimetableStore } from '@client/stores'
import type { CourseStatusType } from '@client/types'
import { computed } from 'vue'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconBookOpen from '~icons/lucide/book-open'
import IconCalendarX from '~icons/lucide/calendar-x'
import IconCheck from '~icons/lucide/check'

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
const isAllComplete = computed(() => totalSelectedCount.value > 0 && statusCounts.value.conflict === 0 && statusCounts.value.incomplete === 0)

/** Whether there are issues to address */
const hasIssues = computed(() => statusCounts.value.conflict > 0 || statusCounts.value.incomplete > 0)

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
		return `${baseClass} ring-2 ring-offset-1 ring-[var(--insis-blue)]`
	}
	return baseClass
}
</script>

<template>
	<div v-if="totalSelectedCount > 0" class="course-status-summary">
		<div class="flex flex-wrap items-center gap-2">
			<!-- Selected courses badge -->
			<button
				type="button"
				:class="[
					'status-badge',
					getBadgeClasses(
						'selected',
						isAllComplete
							? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
							: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
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
			<span v-if="totalEcts > 0" class="text-xs text-[var(--insis-gray-500)] px-2 border-l border-[var(--insis-border)]"> {{ totalEcts }} ECTS </span>

			<!-- Divider when there are issues -->
			<span v-if="hasIssues" class="text-[var(--insis-gray-300)]">|</span>

			<!-- Conflict warning badge -->
			<button
				v-if="statusCounts.conflict > 0"
				type="button"
				:class="['status-badge', getBadgeClasses('conflict', 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200')]"
				:title="$t('components.courses.CourseStatusSummary.conflictTooltip')"
				@click="handleBadgeClick('conflict')"
			>
				<IconCalendarX class="h-3.5 w-3.5" />
				<span>
					{{ $t('components.courses.CourseStatusSummary.conflicts', { count: statusCounts.conflict }) }}
				</span>
			</button>

			<!-- Incomplete warning badge -->
			<button
				v-if="statusCounts.incomplete > 0"
				type="button"
				:class="['status-badge', getBadgeClasses('incomplete', 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200')]"
				:title="$t('components.courses.CourseStatusSummary.incompleteTooltip')"
				@click="handleBadgeClick('incomplete')"
			>
				<IconAlertTriangle class="h-3.5 w-3.5" />
				<span>
					{{ $t('components.courses.CourseStatusSummary.incomplete', { count: statusCounts.incomplete }) }}
				</span>
			</button>

			<!-- Clear filter indicator -->
			<button v-if="isFiltering" type="button" class="text-xs text-[var(--insis-blue)] hover:underline ml-2" @click="clearFilters">
				{{ $t('common.clearFilter') }}
			</button>
		</div>

		<!-- Success message when all complete -->
		<p v-if="isAllComplete" class="mt-1 text-xs text-green-600">
			<IconCheck class="inline h-3 w-3 mr-0.5" />
			{{ $t('components.courses.CourseStatusSummary.allComplete') }}
		</p>
	</div>
</template>

<style scoped>
.course-status-summary {
	padding: 0.5rem 0;
}

.status-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.25rem 0.625rem;
	border-radius: 9999px;
	border: 1px solid;
	font-size: 0.75rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s ease;
}

.status-badge:focus {
	outline: none;
}

.status-badge:active {
	transform: scale(0.98);
}
</style>
