<script setup lang="ts">
import FilterCheckboxGroup from '@client/components/filters/FilterCheckboxGroup.vue'
import FilterTimeRange from '@client/components/filters/FilterTimeRange.vue'
import { useCoursesStore, useUIStore } from '@client/stores'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconFilter from '~icons/lucide/filter'
import IconRotateCcw from '~icons/lucide/rotate-ccw'
import Search from '~icons/lucide/search'
import IconX from '~icons/lucide/x'

/*
 * FilterPanel
 * Left sidebar panel containing all course filters.
 * Dynamically renders filters based on available facets from the API.
 * Each filter section is collapsible.
 */

const { t } = useI18n({ useScope: 'global' })
const coursesStore = useCoursesStore()
const uiStore = useUIStore()

// Track collapsed state for time filter separately
const timeFilterCollapsed = ref(false)

const localTitleSearch = ref(coursesStore.filters.title ?? '')
const localTitleTimeout = ref<number | null>(null)

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
		defaultCollapsed: true, // Collapsed by default
	},
	{
		key: 'groups',
		label: t('components.filters.FilterPanel.courseGroups'),
		facets: coursesStore.facets.groups,
		translations: 'courseGroups',
		selected: coursesStore.filters.groups,
		setter: coursesStore.setGroups,
		// Only show when filtering by study plan
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
		// Only show when filtering by study plan
		visible: coursesStore.filters.study_plan_ids && coursesStore.filters.study_plan_ids.length > 0,
		defaultCollapsed: false,
	},
	{
		key: 'ects',
		label: t('components.filters.FilterPanel.ectsCredits'),
		facets: coursesStore.facets.ects,
		selected: coursesStore.filters.ects?.map(String),
		setter: (values: string[]) => coursesStore.setEcts(values.map(Number)),
		defaultCollapsed: true, // Collapsed by default
	},
	{
		key: 'modes_of_completion',
		label: t('components.filters.FilterPanel.completionMode'),
		facets: coursesStore.facets.modes_of_completion,
		translations: 'courseModesOfCompletion',
		selected: coursesStore.filters.mode_of_completions,
		setter: coursesStore.setModesOfCompletion,
		defaultCollapsed: true, // Collapsed by default
	},
	{
		key: 'lecturers',
		label: t('components.filters.FilterPanel.lecturers'),
		facets: coursesStore.facets.lecturers,
		selected: coursesStore.filters.lecturers,
		setter: coursesStore.setLecturers,
		searchable: true,
		defaultCollapsed: true, // Collapsed by default (usually large list)
	},
])

// Only show facets that have items and are visible
const visibleFacets = computed(() => facetConfig.value.filter((f) => f.facets.length > 0 && (f.visible === undefined || f.visible)))

// Count active time filters
const activeTimeFilterCount = computed(() => (coursesStore.filters.include_times?.length || 0) + (coursesStore.filters.exclude_times?.length || 0))

/* eslint-disable  @typescript-eslint/no-explicit-any */
function handleFilterChange(setter: (values: any[]) => void, values: string[]) {
	setter(values)
	coursesStore.fetchCourses()
}

function handleTitleSearchInput(event: Event) {
	const target = event.target as HTMLInputElement
	const value = target.value
	localTitleSearch.value = value

	if (localTitleTimeout.value) {
		clearTimeout(localTitleTimeout.value)
	}

	localTitleTimeout.value = window.setTimeout(() => {
		coursesStore.setTitleSearch(value)
		coursesStore.fetchCourses()
	}, 750)
}

function handleResetFilters() {
	coursesStore.resetFilters()
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
			// Mobile: slide-in overlay
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

		<div class="filter-group">
			<!-- Title Search -->
			<div class="flex-1 w-full py-1">
				<label class="insis-label" for="title-search">{{ $t('components.filters.FilterPanel.searchLabel') }}</label>
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
			<button type="button" class="flex w-full items-center justify-between py-1 text-left" @click="toggleTimeFilter">
				<span class="insis-label mb-0 flex items-center gap-1.5">
					{{ $t('components.filters.FilterPanel.timeRestriction') }}
					<span v-if="activeTimeFilterCount > 0" class="rounded-full bg-[var(--insis-blue)] px-1.5 py-0.5 text-[10px] text-white">
						{{ activeTimeFilterCount }}
					</span>
				</span>
				<svg
					class="h-4 w-4 text-[var(--insis-gray-500)] transition-transform"
					:class="{ 'rotate-180': !timeFilterCollapsed }"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
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
