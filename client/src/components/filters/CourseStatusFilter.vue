<script setup lang="ts">
import { useCourseLabels } from '@client/composables'
import { useSharedCourseStatusFilter } from '@client/composables/useCourseStatusFilter'
import type { CourseStatus, CourseStatusType } from '@client/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconBookOpen from '~icons/lucide/book-open'
import IconCalendarX from '~icons/lucide/calendar-x'
import IconChevronDown from '~icons/lucide/chevron-down'

/**
 * CourseStatusFilter
 *
 * Checkbox-style filter for course statuses (selected, conflicts, incomplete).
 * Displays like other filter groups in the sidebar with:
 * - Status type filters (All Selected, With Conflicts, Incomplete)
 * - Individual course filters grouped by status
 * - Multi-select support
 * - Show conflicting courses together when filtering
 */

const { t } = useI18n()
const { getUnitTypeLabel } = useCourseLabels()

const {
	statusCounts,
	totalSelectedCount,
	filterOptions,
	courseOptions,
	selectedStatuses,
	selectedCourseIdents,
	isFiltering,
	toggleStatusFilter,
	toggleCourseFilter,
	clearFilters,
	isStatusSelected,
	isCourseSelected,
} = useSharedCourseStatusFilter()

// Collapsed states
const isCollapsed = ref(false)
const showConflictDetails = ref(false)
const showIncompleteDetails = ref(false)

/** Total active filter count */
const activeFilterCount = computed(() => selectedStatuses.value.length + selectedCourseIdents.value.length)

/** Whether we have any courses to filter */
const hasCourses = computed(() => totalSelectedCount.value > 0)

/** Get icon component for status type */
function getStatusIcon(status: CourseStatusType) {
	switch (status) {
		case 'conflict':
			return IconCalendarX
		case 'incomplete':
			return IconAlertTriangle
		default:
			return IconBookOpen
	}
}

/** Get color classes for status type */
function getStatusColorClass(status: CourseStatusType): string {
	switch (status) {
		case 'conflict':
			return 'text-red-600'
		case 'incomplete':
			return 'text-amber-600'
		default:
			return 'text-blue-600'
	}
}

/** Get background color for selected state */
function getSelectedBgClass(status: CourseStatusType): string {
	switch (status) {
		case 'conflict':
			return 'bg-red-50'
		case 'incomplete':
			return 'bg-amber-50'
		default:
			return 'bg-blue-50'
	}
}

/** Get tooltip for a course status */
function getCourseTooltip(course: CourseStatus): string {
	if (course.status === 'conflict') {
		return t('components.filters.CourseStatusFilter.conflictsWith', {
			courses: course.conflictsWith.join(', '),
		})
	}
	if (course.status === 'incomplete') {
		const types = course.missingTypes.map(getUnitTypeLabel).join(', ')
		return t('components.filters.CourseStatusFilter.missingTypes', { types })
	}
	return ''
}

/** Toggle collapsed state */
function toggleCollapsed() {
	isCollapsed.value = !isCollapsed.value
}
</script>

<template>
	<div v-if="hasCourses" class="filter-group">
		<!-- Collapsible header -->
		<button type="button" class="flex w-full cursor-pointer items-center justify-between py-1 text-left" @click="toggleCollapsed">
			<span class="insis-label mb-0 flex items-center gap-1.5">
				{{ $t('components.filters.CourseStatusFilter.title') }}
				<span v-if="activeFilterCount > 0" class="rounded-full bg-[var(--insis-blue)] px-1.5 py-0.5 text-[10px] text-white">
					{{ activeFilterCount }}
				</span>
			</span>
			<IconChevronDown :class="['h-4 w-4 text-[var(--insis-gray-500)] transition-transform', { 'rotate-180': !isCollapsed }]" />
		</button>

		<!-- Collapsible content -->
		<div v-show="!isCollapsed" class="mt-2 space-y-3">
			<!-- Clear filter button -->
			<button v-if="isFiltering" type="button" class="text-xs cursor-pointer text-[var(--insis-blue)] hover:underline" @click="clearFilters">
				{{ $t('common.clearFilter') }}
			</button>

			<!-- Status type filters -->
			<div class="space-y-1">
				<label
					v-for="option in filterOptions"
					:key="option.value"
					:class="[
						'insis-checkbox-label cursor-pointer rounded px-1 -mx-1 transition-colors',
						isStatusSelected(option.value) ? getSelectedBgClass(option.value) : '',
					]"
				>
					<input
						type="checkbox"
						class="insis-checkbox"
						:checked="isStatusSelected(option.value)"
						:disabled="option.count === 0"
						@change="toggleStatusFilter(option.value)"
					/>
					<component :is="getStatusIcon(option.value)" :class="['h-4 w-4 shrink-0', getStatusColorClass(option.value)]" />
					<span class="flex-1 text-sm">{{ option.label }}</span>
					<span :class="['text-xs', option.count === 0 ? 'text-[var(--insis-gray-400)] italic' : 'text-[var(--insis-gray-500)]']">
						({{ option.count }})
					</span>
				</label>
			</div>

			<!-- Conflict courses details -->
			<div v-if="statusCounts.conflict > 0" class="border-t border-[var(--insis-border-light)] pt-2">
				<button
					type="button"
					class="flex cursor-pointer w-full items-center gap-1 text-xs text-[var(--insis-gray-600)] hover:text-[var(--insis-text)]"
					@click="showConflictDetails = !showConflictDetails"
				>
					<IconChevronDown :class="['h-3 w-3 transition-transform', { 'rotate-180': showConflictDetails }]" />
					<IconCalendarX class="h-3 w-3 text-red-500" />
					<span>{{ $t('components.filters.CourseStatusFilter.conflictingCourses') }}</span>
					<span class="text-[var(--insis-gray-400)]">({{ statusCounts.conflict }})</span>
				</button>

				<div v-if="showConflictDetails" class="mt-2 space-y-1 pl-4">
					<label
						v-for="course in courseOptions.conflicts"
						:key="course.id"
						:class="['insis-checkbox-label cursor-pointer rounded px-1 -mx-1 transition-colors', isCourseSelected(course.ident) ? 'bg-red-50' : '']"
						:title="getCourseTooltip(course)"
					>
						<input type="checkbox" class="insis-checkbox" :checked="isCourseSelected(course.ident)" @change="toggleCourseFilter(course.ident)" />
						<span class="flex-1 truncate text-sm">{{ course.ident }}</span>
						<span class="text-xs text-red-500"> ↔ {{ course.conflictsWith.join(', ') }} </span>
					</label>
				</div>
			</div>

			<!-- Incomplete courses details -->
			<div v-if="statusCounts.incomplete > 0" class="border-t border-[var(--insis-border-light)] pt-2">
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-1 text-xs text-[var(--insis-gray-600)] hover:text-[var(--insis-text)]"
					@click="showIncompleteDetails = !showIncompleteDetails"
				>
					<IconChevronDown :class="['h-3 w-3 transition-transform', { 'rotate-180': showIncompleteDetails }]" />
					<IconAlertTriangle class="h-3 w-3 text-amber-500" />
					<span>{{ $t('components.filters.CourseStatusFilter.incompleteCourses') }}</span>
					<span class="text-[var(--insis-gray-400)]">({{ statusCounts.incomplete }})</span>
				</button>

				<div v-if="showIncompleteDetails" class="mt-2 space-y-1 pl-4">
					<label
						v-for="course in courseOptions.incomplete"
						:key="course.id"
						:class="[
							'insis-checkbox-label cursor-pointer rounded px-1 -mx-1 transition-colors',
							isCourseSelected(course.ident) ? 'bg-amber-50' : '',
						]"
						:title="getCourseTooltip(course)"
					>
						<input type="checkbox" class="insis-checkbox" :checked="isCourseSelected(course.ident)" @change="toggleCourseFilter(course.ident)" />
						<span class="flex-1 truncate text-sm">{{ course.ident }}</span>
						<span class="text-xs text-amber-600">
							{{ $t('components.filters.CourseStatusFilter.missingLabel') }}:
							{{ course.missingTypes.map(getUnitTypeLabel).join(', ') }}
						</span>
					</label>
				</div>
			</div>

			<!-- Help text -->
			<p class="text-[10px] text-[var(--insis-gray-500)]">
				{{ $t('components.filters.CourseStatusFilter.helpText') }}
			</p>
		</div>
	</div>
</template>

<style scoped>
.filter-group {
	border-bottom: 1px solid var(--insis-border-light);
	padding-bottom: 0.75rem;
	margin-bottom: 0.75rem;
}

.filter-group:last-of-type {
	border-bottom: none;
	margin-bottom: 0;
}
</style>
