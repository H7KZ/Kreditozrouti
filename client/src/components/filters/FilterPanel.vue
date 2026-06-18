<script setup lang="ts">
import type { CoursesFilter } from '@shared/http/courses'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CollapsibleSection from '@client/components/common/CollapsibleSection.vue'
import CourseStatusFilter from '@client/components/filters/CourseStatusFilter.vue'
import FilterCheckboxGroup from '@client/components/filters/FilterCheckboxGroup.vue'
import FilterTimeRange from '@client/components/filters/FilterTimeRange.vue'
import { useDebouncedFn } from '@client/composables'
import { useCompletedCoursesStore, useCoursesStore, useFiltersStore, useTimetableStore, useUIStore } from '@client/stores'
import IconCalendarX from '~icons/lucide/calendar-x'
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
const filtersStore = useFiltersStore()
const timetableStore = useTimetableStore()
const completedCoursesStore = useCompletedCoursesStore()
const uiStore = useUIStore()

const localTitleSearch = ref(filtersStore.filters.title ?? '')
const syllabusSearchValue = ref(filtersStore.filters.search ?? '')

// Debounced search using composable
const debouncedFetchCourses = useDebouncedFn(() => {
	filtersStore.setFilter('title', localTitleSearch.value)
	if (localTitleSearch.value) {
		syllabusSearchValue.value = ''
		filtersStore.setFilter('search', '')
	}
	coursesStore.fetchCourses()
}, 750)

const debouncedFetchSyllabusSearch = useDebouncedFn(() => {
	filtersStore.setFilter('search', syllabusSearchValue.value)
	if (syllabusSearchValue.value) {
		localTitleSearch.value = ''
		filtersStore.setFilter('title', '')
	}
	coursesStore.fetchCourses()
}, 800)

// Facet configuration for dynamic rendering
const facetConfig = computed(() => [
	{
		key: 'faculties',
		label: t('components.filters.FilterPanel.faculties'),
		facets: coursesStore.facets.faculties,
		selected: filtersStore.filters.faculty_ids,
		setter: (ids: string[]) => filtersStore.setFilter('faculty_ids', ids),
		defaultCollapsed: false,
	},
	{
		key: 'levels',
		label: t('components.filters.FilterPanel.studyLevel'),
		facets: coursesStore.facets.levels,
		translations: 'courseLevels',
		selected: filtersStore.filters.levels,
		setter: (levels: string[]) => filtersStore.setFilter('levels', levels),
		defaultCollapsed: false,
	},
	{
		key: 'languages',
		label: t('components.filters.FilterPanel.language'),
		facets: coursesStore.facets.languages,
		translations: 'courseLanguages',
		selected: filtersStore.filters.languages,
		setter: (languages: string[]) => filtersStore.setFilter('languages', languages),
		defaultCollapsed: true,
	},
	{
		key: 'groups',
		label: t('components.filters.FilterPanel.courseGroups'),
		facets: coursesStore.facets.groups,
		translations: 'courseGroups',
		selected: filtersStore.filters.groups,
		setter: (groups: string[]) => filtersStore.setFilter('groups', groups as CoursesFilter['groups']),
		visible: filtersStore.filters.study_plan_ids && filtersStore.filters.study_plan_ids.length > 0,
		defaultCollapsed: false,
	},
	{
		key: 'categories',
		label: t('components.filters.FilterPanel.category'),
		facets: coursesStore.facets.categories,
		translations: 'courseCategories',
		selected: filtersStore.filters.categories,
		setter: (categories: string[]) => filtersStore.setFilter('categories', categories as CoursesFilter['categories']),
		visible: filtersStore.filters.study_plan_ids && filtersStore.filters.study_plan_ids.length > 0,
		defaultCollapsed: false,
	},
	{
		key: 'ects',
		label: t('components.filters.FilterPanel.ectsCredits'),
		facets: coursesStore.facets.ects,
		selected: filtersStore.filters.ects?.map(String),
		setter: (values: string[]) => filtersStore.setFilter('ects', values.map(Number)),
		defaultCollapsed: true,
	},
	{
		key: 'modes_of_completion',
		label: t('components.filters.FilterPanel.completionMode'),
		facets: coursesStore.facets.modes_of_completion,
		translations: 'courseModesOfCompletion',
		selected: filtersStore.filters.mode_of_completions,
		setter: (modes: string[]) => filtersStore.setFilter('mode_of_completions', modes),
		defaultCollapsed: true,
	},
	{
		key: 'assessment_methods',
		label: t('components.filters.FilterPanel.assessmentMethods'),
		facets: coursesStore.facets.assessment_methods,
		translations: 'assessmentMethods',
		selected: filtersStore.filters.assessment_methods,
		setter: (methods: string[]) => filtersStore.setFilter('assessment_methods', methods),
		defaultCollapsed: true,
	},
	{
		key: 'lecturers',
		label: t('components.filters.FilterPanel.lecturers'),
		facets: coursesStore.facets.lecturers,
		selected: filtersStore.filters.lecturers,
		setter: (lecturers: string[]) => filtersStore.setFilter('lecturers', lecturers),
		searchable: true,
		defaultCollapsed: true,
	},
])

// Only show facets that have items and are visible
const visibleFacets = computed(() => facetConfig.value.filter((f) => f.facets.length > 0 && (f.visible === undefined || f.visible)))

// Count active time filters
const activeTimeFilterCount = computed(() => (filtersStore.filters.include_times?.length || 0) + (filtersStore.filters.exclude_times?.length || 0))

// Check if there are any selected courses to show the status filter
const hasSelectedCourses = computed(() => timetableStore.selectedCourseIds.length > 0)

// Completed courses info
const completedCourseCount = computed(() => completedCoursesStore.completedCourseIdents.length)
const hasCompletedCourses = computed(() => completedCourseCount.value > 0)

/**
 * Whether completed courses are currently being filtered out.
 * True when completed_course_idents filter is active (courses are hidden).
 */
const isHidingCompletedCourses = computed(() => (filtersStore.filters.completed_course_idents?.length ?? 0) > 0)

/**
 * Toggle showing/hiding completed courses.
 * When toggled on: sets completed_course_idents from wizard.
 * When toggled off: clears the filter to show all courses.
 */
function toggleShowCompletedCourses() {
	if (isHidingCompletedCourses.value) {
		// Show completed courses (clear filter)
		filtersStore.filters.completed_course_idents = []
	} else {
		// Hide completed courses (apply filter)
		filtersStore.filters.completed_course_idents = [...completedCoursesStore.completedCourseIdents]
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

function handleSyllabusSearchInput(event: Event) {
	const target = event.target as HTMLInputElement
	syllabusSearchValue.value = target.value
	debouncedFetchSyllabusSearch()
}

function handleResetFilters() {
	coursesStore.resetFilters()
	localTitleSearch.value = ''
	syllabusSearchValue.value = ''
	coursesStore.fetchCourses()
}

function handleCloseMobileFilter() {
	uiStore.closeMobileFilter()
}
</script>

<template>
	<aside class="insis-search-panel h-full overflow-y-auto">
		<!-- Mobile header -->
		<div class="flex items-center justify-between border-b border-(--insis-border) pt-2 pb-5 lg:hidden">
			<div class="flex items-center gap-2 font-medium">
				<IconFilter class="h-4 w-4" aria-hidden="true" />
				{{ $t('common.filters') }}
			</div>
			<button type="button" class="insis-btn-text" :aria-label="$t('common.closeFilters')" @click="handleCloseMobileFilter">
				<IconX class="h-5 w-5" aria-hidden="true" />
			</button>
		</div>

		<!-- Header with reset button -->
		<div class="mb-4 flex items-center justify-between">
			<div v-if="!uiStore.mobileFilterOpen" class="flex items-center gap-2 text-sm font-medium text-(--insis-gray-900)">
				<IconFilter class="h-4 w-4" aria-hidden="true" />
				{{ $t('common.filters') }}
				<span
					v-if="filtersStore.activeFilterCount > 0"
					class="rounded-full bg-(--insis-blue) px-1.5 py-0.5 text-xs text-white"
					:aria-label="$t('components.filters.FilterPanel.activeFilterCount', { count: filtersStore.activeFilterCount })"
				>
					{{ filtersStore.activeFilterCount }}
				</span>
			</div>
			<button
				v-if="filtersStore.hasActiveFilters"
				type="button"
				class="insis-btn-text flex items-center gap-1 text-xs"
				:aria-label="$t('common.reset')"
				@click="handleResetFilters"
			>
				<IconRotateCcw class="h-3 w-3" aria-hidden="true" />
				{{ $t('common.reset') }}
			</button>
		</div>

		<!-- Completed Courses Toggle -->
		<div v-if="hasCompletedCourses" class="mb-3 border-b border-(--insis-border-light) pb-3 last:mb-0 last:border-b-0">
			<div class="flex items-center justify-between">
				<span class="insis-label mb-0 flex items-center gap-1.5">
					<IconCircleCheck class="h-4 w-4 text-(--insis-success)" aria-hidden="true" />
					{{ $t('components.filters.FilterPanel.completedCourses') }}
				</span>
				<span
					class="text-end text-xs text-(--insis-gray-500)"
					:aria-label="$t('components.filters.FilterPanel.completedCoursesCount', { count: completedCourseCount })"
				>
					{{ $t('components.filters.FilterPanel.completedCoursesCount', { count: completedCourseCount }) }}
				</span>
			</div>
			<label class="mt-2 flex cursor-pointer items-center gap-2 text-sm text-(--insis-gray-600)">
				<input
					type="checkbox"
					class="insis-checkbox"
					:checked="!isHidingCompletedCourses"
					:aria-label="$t('components.filters.FilterPanel.showCompletedCourses')"
					@change="toggleShowCompletedCourses"
				/>
				{{ $t('components.filters.FilterPanel.showCompletedCourses') }}
			</label>
		</div>

		<!-- Timetable Collision Exclusion Toggle -->
		<div v-if="hasSelectedCourses" class="mb-3 border-b border-(--insis-border-light) pb-3 last:mb-0 last:border-b-0">
			<div class="flex items-center justify-between">
				<span class="insis-label mb-0 flex items-center gap-1.5">
					<IconCalendarX class="h-4 w-4 text-(--insis-danger)" aria-hidden="true" />
					{{ $t('components.filters.FilterPanel.timetableConflicts') }}
				</span>
				<span
					class="text-end text-xs text-(--insis-gray-500)"
					:aria-label="$t('components.filters.FilterPanel.timetableSlotsCount', { count: timetableSlotCount })"
				>
					{{ $t('components.filters.FilterPanel.timetableSlotsCount', { count: timetableSlotCount }) }}
				</span>
			</div>
			<label class="mt-2 flex cursor-pointer items-center gap-2 text-sm text-(--insis-gray-600)">
				<input
					type="checkbox"
					class="insis-checkbox"
					:checked="filtersStore.hideConflictingCourses"
					:aria-label="$t('components.filters.FilterPanel.hideConflictingCourses')"
					@change="coursesStore.toggleHideConflictingCourses()"
				/>
				{{ $t('components.filters.FilterPanel.hideConflictingCourses') }}
			</label>
			<p v-if="filtersStore.hideConflictingCourses" class="mt-1 text-[10px] text-(--insis-gray-500)">
				{{ $t('components.filters.FilterPanel.hideConflictingCoursesHelp') }}
			</p>
		</div>

		<!-- Course Status Filter (replaces FilterQuickTags) -->
		<CourseStatusFilter v-if="hasSelectedCourses" />

		<div class="mb-3 border-b border-(--insis-border-light) pb-3 last:mb-0 last:border-b-0">
			<!-- Title Search -->
			<div class="w-full flex-1 py-1">
				<label class="insis-label" for="title-search">
					{{ $t('components.filters.FilterPanel.searchLabel') }}
				</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-(--insis-gray-500)" aria-hidden="true" />
					<input
						id="title-search"
						type="text"
						class="insis-input pl-9"
						:placeholder="$t('components.filters.FilterPanel.searchPlaceholder')"
						:value="localTitleSearch"
						:aria-label="$t('components.filters.FilterPanel.searchLabel')"
						@input="handleTitleSearchInput"
					/>
				</div>
			</div>

			<!-- Full-Text Search -->
			<div class="mt-2 w-full flex-1 space-y-1 py-1">
				<label class="text-xs font-medium text-(--insis-text-2)" for="syllabus-search">
					{{ $t('filters.syllabusSearch') }}
				</label>
				<div class="relative">
					<input
						id="syllabus-search"
						v-model="syllabusSearchValue"
						type="text"
						:placeholder="$t('filters.syllabusSearchPlaceholder')"
						class="insis-input w-full pl-8 text-sm"
						@input="handleSyllabusSearchInput"
					/>
					<Search class="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--insis-gray-400)" />
				</div>
				<p class="text-[10px] text-(--insis-text-3)">
					{{ $t('filters.syllabusSearchHint') }}
				</p>
			</div>
		</div>

		<!-- Time Range Filter (collapsible) -->
		<div class="mb-3 border-b border-(--insis-border-light) pb-3 last:mb-0 last:border-b-0">
			<CollapsibleSection
				:title="$t('components.filters.FilterPanel.timeRestriction')"
				:badge="activeTimeFilterCount > 0 ? activeTimeFilterCount : undefined"
				:default-open="true"
			>
				<FilterTimeRange />
			</CollapsibleSection>
		</div>

		<!-- Dynamic Facet Filters -->
		<div v-for="facet in visibleFacets" :key="facet.key" class="mb-3 border-b border-(--insis-border-light) pb-3 last:mb-0 last:border-b-0">
			<FilterCheckboxGroup
				:label="facet.label"
				:facets="facet.facets"
				:translations="facet.translations"
				:selected="facet.selected?.map(String) ?? []"
				:searchable="facet.searchable"
				:default-collapsed="facet.defaultCollapsed"
				@update:selected="(values: string[]) => handleFilterChange(facet.setter, values)"
			/>
		</div>
	</aside>
</template>
