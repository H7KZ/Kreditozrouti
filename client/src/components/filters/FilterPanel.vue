<script setup lang="ts">
import CourseStatusFilter from '@client/components/filters/CourseStatusFilter.vue'
import FilterCheckboxGroup from '@client/components/filters/FilterCheckboxGroup.vue'
import FilterTimeRange from '@client/components/filters/FilterTimeRange.vue'
import { useDebouncedFn } from '@client/composables'
import { useCoursesStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCalendarX from '~icons/lucide/calendar-x'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconCircleCheck from '~icons/lucide/circle-check'
import IconFilter from '~icons/lucide/filter'
import IconRotateCcw from '~icons/lucide/rotate-ccw'
import Search from '~icons/lucide/search'
import IconX from '~icons/lucide/x'

/**
 * FilterPanel
 *
 * Left sidebar panel containing all course filters.
 * Dynamically renders filters based on available facets from the API.
 * Each filter section is collapsible.
 *
 * Now includes:
 * - CourseStatusFilter for filtering by timetable status
 * - Completed courses toggle to show/hide already-completed courses
 * - Timetable collision exclusion toggle to hide courses that conflict with selected timetable
 */

const { t } = useI18n({ useScope: 'global' })
const coursesStore = useCoursesStore()
const timetableStore = useTimetableStore()
const wizardStore = useWizardStore()
const uiStore = useUIStore()

// Track collapsed state for time filter separately
const timeFilterCollapsed = ref(false)

const localTitleSearch = ref(coursesStore.filters.title ?? '')

// Debounced search using composable
const debouncedFetchCourses = useDebouncedFn(() => {
	coursesStore.setTitleSearch(localTitleSearch.value)
	coursesStore.fetchCourses()
}, 750)

// Facet configuration for dynamic rendering
const facetConfig = computed(() => [
	{
		key: 'faculties',
		label: t('components.filters.FilterPanel.faculties'),
		facets: coursesStore.facets.faculties,
		selected: coursesStore.filters.faculty_ids,
		setter: coursesStore.setFacultyIds,
		defaultCollapsed: false,
	},
	{
		key: 'levels',
		label: t('components.filters.FilterPanel.studyLevel'),
		facets: coursesStore.facets.levels,
		translations: 'courseLevels',
		selected: coursesStore.filters.levels,
		setter: coursesStore.setLevels,
		defaultCollapsed: false,
	},
	{
		key: 'languages',
		label: t('components.filters.FilterPanel.language'),
		facets: coursesStore.facets.languages,
		translations: 'courseLanguages',
		selected: coursesStore.filters.languages,
		setter: coursesStore.setLanguages,
		defaultCollapsed: true,
	},
	{
		key: 'groups',
		label: t('components.filters.FilterPanel.courseGroups'),
		facets: coursesStore.facets.groups,
		translations: 'courseGroups',
		selected: coursesStore.filters.groups,
		setter: coursesStore.setGroups,
		visible: coursesStore.filters.study_plan_ids && coursesStore.filters.study_plan_ids.length > 0,
		defaultCollapsed: false,
	},
	{
		key: 'categories',
		label: t('components.filters.FilterPanel.category'),
		facets: coursesStore.facets.categories,
		translations: 'courseCategories',
		selected: coursesStore.filters.categories,
		setter: coursesStore.setCategories,
		visible: coursesStore.filters.study_plan_ids && coursesStore.filters.study_plan_ids.length > 0,
		defaultCollapsed: false,
	},
	{
		key: 'ects',
		label: t('components.filters.FilterPanel.ectsCredits'),
		facets: coursesStore.facets.ects,
		selected: coursesStore.filters.ects?.map(String),
		setter: (values: string[]) => coursesStore.setEcts(values.map(Number)),
		defaultCollapsed: true,
	},
	{
		key: 'modes_of_completion',
		label: t('components.filters.FilterPanel.completionMode'),
		facets: coursesStore.facets.modes_of_completion,
		translations: 'courseModesOfCompletion',
		selected: coursesStore.filters.mode_of_completions,
		setter: coursesStore.setModesOfCompletion,
		defaultCollapsed: true,
	},
	{
		key: 'lecturers',
		label: t('components.filters.FilterPanel.lecturers'),
		facets: coursesStore.facets.lecturers,
		selected: coursesStore.filters.lecturers,
		setter: coursesStore.setLecturers,
		searchable: true,
		defaultCollapsed: true,
	},
])

// Only show facets that have items and are visible
const visibleFacets = computed(() => facetConfig.value.filter((f) => f.facets.length > 0 && (f.visible === undefined || f.visible)))

// Count active time filters
const activeTimeFilterCount = computed(() => (coursesStore.filters.include_times?.length || 0) + (coursesStore.filters.exclude_times?.length || 0))

// Check if there are any selected courses to show the status filter
const hasSelectedCourses = computed(() => timetableStore.selectedCourseIds.length > 0)

// Completed courses info
const completedCourseCount = computed(() => wizardStore.completedCourseIdents.length)
const hasCompletedCourses = computed(() => completedCourseCount.value > 0)

/**
 * Whether completed courses are currently being filtered out.
 * True when completed_course_idents filter is active (courses are hidden).
 */
const isHidingCompletedCourses = computed(() => (coursesStore.filters.completed_course_idents?.length ?? 0) > 0)

/**
 * Toggle showing/hiding completed courses.
 * When toggled on: sets completed_course_idents from wizard.
 * When toggled off: clears the filter to show all courses.
 */
function toggleShowCompletedCourses() {
	if (isHidingCompletedCourses.value) {
		// Show completed courses (clear filter)
		coursesStore.filters.completed_course_idents = []
	} else {
		// Hide completed courses (apply filter)
		coursesStore.filters.completed_course_idents = [...wizardStore.completedCourseIdents]
	}
	coursesStore.fetchCourses()
}

// Timetable collision info
const timetableSlotCount = computed(() => timetableStore.selectedUnits.length)

/* eslint-disable @typescript-eslint/no-explicit-any */
function handleFilterChange(setter: (values: any[]) => void, values: string[]) {
	setter(values)
	coursesStore.fetchCourses()
}

function handleTitleSearchInput(event: Event) {
	const target = event.target as HTMLInputElement
	localTitleSearch.value = target.value
	debouncedFetchCourses()
}

function handleResetFilters() {
	coursesStore.resetFilters()
	localTitleSearch.value = ''
	coursesStore.fetchCourses()
}

function handleCloseMobileFilter() {
	uiStore.closeMobileFilter()
}

function toggleTimeFilter() {
	timeFilterCollapsed.value = !timeFilterCollapsed.value
}
</script>

<template>
	<aside
		:class="[
			'insis-search-panel h-full overflow-y-auto',
			'fixed inset-y-0 left-0 z-30 width-fit transition-transform lg:relative lg:translate-x-0',
			uiStore.mobileFilterOpen ? 'translate-x-0 w-full' : '-translate-x-full',
		]"
	>
		<!-- Mobile header -->
		<div class="flex items-center justify-between border-b border-[var(--insis-border)] p-3 lg:hidden">
			<div class="flex items-center gap-2 font-medium">
				<IconFilter class="h-4 w-4" />
				{{ $t('common.filters') }}
			</div>
			<button type="button" class="insis-btn-text" @click="handleCloseMobileFilter">
				<IconX class="h-5 w-5" />
			</button>
		</div>

		<!-- Header with reset button -->
		<div class="mb-4 flex items-center justify-between">
			<div v-if="!uiStore.mobileFilterOpen" class="flex items-center gap-2 text-sm font-medium text-[var(--insis-gray-900)]">
				<IconFilter class="h-4 w-4" />
				{{ $t('common.filters') }}
				<span v-if="coursesStore.activeFilterCount > 0" class="rounded-full bg-[var(--insis-blue)] px-1.5 py-0.5 text-xs text-white">
					{{ coursesStore.activeFilterCount }}
				</span>
			</div>
			<button v-if="coursesStore.hasActiveFilters" type="button" class="insis-btn-text flex items-center gap-1 text-xs" @click="handleResetFilters">
				<IconRotateCcw class="h-3 w-3" />
				{{ $t('common.reset') }}
			</button>
		</div>

		<!-- Completed Courses Toggle -->
		<div v-if="hasCompletedCourses" class="filter-group">
			<div class="flex items-center justify-between">
				<span class="insis-label mb-0 flex items-center gap-1.5">
					<IconCircleCheck class="h-4 w-4 text-[var(--insis-success)]" />
					{{ $t('components.filters.FilterPanel.completedCourses') }}
				</span>
				<span class="text-xs text-[var(--insis-gray-500)]">
					{{ $t('components.filters.FilterPanel.completedCoursesCount', { count: completedCourseCount }) }}
				</span>
			</div>
			<label class="mt-2 flex items-center gap-2 cursor-pointer text-sm text-[var(--insis-gray-600)]">
				<input type="checkbox" class="insis-checkbox" :checked="!isHidingCompletedCourses" @change="toggleShowCompletedCourses" />
				{{ $t('components.filters.FilterPanel.showCompletedCourses') }}
			</label>
		</div>

		<!-- Timetable Collision Exclusion Toggle -->
		<div v-if="hasSelectedCourses" class="filter-group">
			<div class="flex items-center justify-between">
				<span class="insis-label mb-0 flex items-center gap-1.5">
					<IconCalendarX class="h-4 w-4 text-red-500" />
					{{ $t('components.filters.FilterPanel.timetableConflicts') }}
				</span>
				<span class="text-xs text-[var(--insis-gray-500)]">
					{{ $t('components.filters.FilterPanel.timetableSlotsCount', { count: timetableSlotCount }) }}
				</span>
			</div>
			<label class="mt-2 flex items-center gap-2 cursor-pointer text-sm text-[var(--insis-gray-600)]">
				<input
					type="checkbox"
					class="insis-checkbox"
					:checked="coursesStore.hideConflictingCourses"
					@change="coursesStore.toggleHideConflictingCourses()"
				/>
				{{ $t('components.filters.FilterPanel.hideConflictingCourses') }}
			</label>
			<p v-if="coursesStore.hideConflictingCourses" class="mt-1 text-[10px] text-[var(--insis-gray-500)]">
				{{ $t('components.filters.FilterPanel.hideConflictingCoursesHelp') }}
			</p>
		</div>

		<!-- Course Status Filter (replaces FilterQuickTags) -->
		<CourseStatusFilter v-if="hasSelectedCourses" />

		<div class="filter-group">
			<!-- Title Search -->
			<div class="flex-1 w-full py-1">
				<label class="insis-label" for="title-search">
					{{ $t('components.filters.FilterPanel.searchLabel') }}
				</label>
				<div class="relative">
					<Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--insis-gray-500)]" />
					<input
						id="title-search"
						type="text"
						class="insis-input pl-9"
						:placeholder="$t('components.filters.FilterPanel.searchPlaceholder')"
						:value="localTitleSearch"
						@input="handleTitleSearchInput"
					/>
				</div>
			</div>
		</div>

		<!-- Time Range Filter (collapsible) -->
		<div class="filter-group">
			<button type="button" class="flex cursor-pointer w-full items-center justify-between py-1 text-left" @click="toggleTimeFilter">
				<span class="insis-label mb-0 flex items-center gap-1.5">
					{{ $t('components.filters.FilterPanel.timeRestriction') }}
					<span v-if="activeTimeFilterCount > 0" class="rounded-full bg-[var(--insis-blue)] px-1.5 py-0.5 text-[10px] text-white">
						{{ activeTimeFilterCount }}
					</span>
				</span>
				<IconChevronDown :class="['h-4 w-4 text-[var(--insis-gray-500)] transition-transform', { 'rotate-180': !timeFilterCollapsed }]" />
			</button>
			<div v-show="!timeFilterCollapsed" class="mt-2">
				<FilterTimeRange />
			</div>
		</div>

		<!-- Dynamic Facet Filters -->
		<div v-for="facet in visibleFacets" :key="facet.key" class="filter-group">
			<FilterCheckboxGroup
				:label="facet.label"
				:facets="facet.facets"
				:translations="facet.translations"
				:selected="facet.selected?.map(String) ?? []"
				:searchable="facet.searchable"
				:default-collapsed="facet.defaultCollapsed"
				@update:selected="(values) => handleFilterChange(facet.setter, values)"
			/>
		</div>
	</aside>
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
