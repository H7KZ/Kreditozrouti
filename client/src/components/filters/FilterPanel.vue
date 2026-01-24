<script setup lang="ts">
/**
 * FilterPanel
 * Left sidebar panel containing all course filters.
 * Dynamically renders filters based on available facets from the API.
 */
import { computed } from 'vue'

import IconChevronLeft from '~icons/lucide/chevron-left'
import IconFilter from '~icons/lucide/filter'
import IconRotateCcw from '~icons/lucide/rotate-ccw'
import IconX from '~icons/lucide/x'

import FilterCheckboxGroup from '@client/components/filters/FilterCheckboxGroup.vue'
import FilterTimeRange from '@client/components/filters/FilterTimeRange.vue'
import { useCoursesStore, useUIStore } from '@client/stores'

const coursesStore = useCoursesStore()
const uiStore = useUIStore()

// Facet configuration for dynamic rendering
const facetConfig = computed(() => [
	{
		key: 'faculties',
		label: 'Fakulty',
		facets: coursesStore.facets.faculties,
		selected: coursesStore.filters.faculty_ids,
		setter: coursesStore.setFacultyIds,
	},
	{
		key: 'levels',
		label: 'Stupeň studia',
		facets: coursesStore.facets.levels,
		selected: coursesStore.filters.levels,
		setter: coursesStore.setLevels,
	},
	{
		key: 'languages',
		label: 'Jazyk výuky',
		facets: coursesStore.facets.languages,
		selected: coursesStore.filters.languages,
		setter: coursesStore.setLanguages,
	},
	{
		key: 'groups',
		label: 'Skupiny předmětů',
		facets: coursesStore.facets.groups,
		selected: coursesStore.filters.groups,
		setter: coursesStore.setGroups,
		// Only show when filtering by study plan
		visible: coursesStore.filters.study_plan_ids && coursesStore.filters.study_plan_ids.length > 0,
	},
	{
		key: 'categories',
		label: 'Kategorie',
		facets: coursesStore.facets.categories,
		selected: coursesStore.filters.categories,
		setter: coursesStore.setCategories,
		// Only show when filtering by study plan
		visible: coursesStore.filters.study_plan_ids && coursesStore.filters.study_plan_ids.length > 0,
	},
	{
		key: 'ects',
		label: 'ECTS kredity',
		facets: coursesStore.facets.ects,
		selected: coursesStore.filters.ects?.map(String),
		setter: (values: string[]) => coursesStore.setEcts(values.map(Number)),
	},
	{
		key: 'modes_of_completion',
		label: 'Způsob ukončení',
		facets: coursesStore.facets.modes_of_completion,
		selected: coursesStore.filters.mode_of_completions,
		setter: coursesStore.setModesOfCompletion,
	},
	{
		key: 'lecturers',
		label: 'Vyučující',
		facets: coursesStore.facets.lecturers,
		selected: coursesStore.filters.lecturers,
		setter: coursesStore.setLecturers,
		searchable: true,
	},
])

// Only show facets that have items and are visible
const visibleFacets = computed(() => facetConfig.value.filter((f) => f.facets.length > 0 && (f.visible === undefined || f.visible)))

/* eslint-disable  @typescript-eslint/no-explicit-any */
function handleFilterChange(setter: (values: any[]) => void, values: string[]) {
	setter(values)
	coursesStore.fetchCourses()
}

function handleResetFilters() {
	coursesStore.resetFilters()
	coursesStore.fetchCourses()
}

function handleCloseMobileFilter() {
	uiStore.closeMobileFilter()
}
</script>

<template>
	<aside
		:class="[
			'insis-search-panel h-full overflow-y-auto',
			// Mobile: slide-in overlay
			'fixed inset-y-0 left-0 z-40 w-72 transition-transform lg:relative lg:translate-x-0',
			uiStore.mobileFilterOpen ? 'translate-x-0' : '-translate-x-full',
		]"
	>
		<!-- Mobile header -->
		<div class="flex items-center justify-between border-b border-[var(--insis-border)] p-3 lg:hidden">
			<div class="flex items-center gap-2 font-medium">
				<IconFilter class="h-4 w-4" />
				Filtry
			</div>
			<button type="button" class="insis-btn-text" @click="handleCloseMobileFilter">
				<IconX class="h-5 w-5" />
			</button>
		</div>

		<!-- Header with reset button -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm font-medium text-[var(--insis-gray-900)]">
				<IconFilter class="h-4 w-4" />
				Filtry
				<span v-if="coursesStore.activeFilterCount > 0" class="rounded-full bg-[var(--insis-blue)] px-1.5 py-0.5 text-xs text-white">
					{{ coursesStore.activeFilterCount }}
				</span>
			</div>
			<button v-if="coursesStore.hasActiveFilters" type="button" class="insis-btn-text flex items-center gap-1 text-xs" @click="handleResetFilters">
				<IconRotateCcw class="h-3 w-3" />
				Reset
			</button>
		</div>

		<!-- Time Range Filter (special component) -->
		<div class="field-group">
			<FilterTimeRange />
		</div>

		<!-- Dynamic Facet Filters -->
		<div v-for="facet in visibleFacets" :key="facet.key" class="field-group">
			<FilterCheckboxGroup
				:label="facet.label"
				:facets="facet.facets"
				:selected="facet.selected?.map(String) ?? []"
				:searchable="facet.searchable"
				@update:selected="(values) => handleFilterChange(facet.setter, values)"
			/>
		</div>

		<!-- Collapse sidebar button (desktop only) -->
		<div class="hidden border-t border-[var(--insis-border)] pt-3 lg:block">
			<button type="button" class="insis-btn-text flex w-full items-center justify-center gap-1 text-xs" @click="uiStore.toggleSidebar">
				<IconChevronLeft class="h-3 w-3" />
				Skrýt filtry
			</button>
		</div>
	</aside>

	<!-- Mobile overlay backdrop -->
	<div v-if="uiStore.mobileFilterOpen" class="fixed inset-0 z-30 bg-black/50 lg:hidden" @click="handleCloseMobileFilter" />
</template>
