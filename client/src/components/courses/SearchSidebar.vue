<script setup lang="ts">
import TimetableFilter from '@client/components/timetable/TimetableFilter.vue'
import { useCourseSearch } from '@client/stores/courseSearch'
import { useStudentContext } from '@client/stores/studentContext'
import InSISDay from '@scraper/Types/InSISDay.ts'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup.ts'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const courseSearch = useCourseSearch()
const studentContext = useStudentContext()

const { filter, facets, isLoading, hasActiveFilters } = storeToRefs(courseSearch)
const { isWizardComplete } = storeToRefs(studentContext)

// Local form state
const searchText = ref('')
const identFilter = ref('')
const selectedDays = ref<InSISDay[]>([])
const selectedGroups = ref<InSISStudyPlanCourseGroup[]>([])

// Watch for external filter changes
watch(
	() => filter.value.ident,
	(val) => {
		identFilter.value = typeof val === 'string' ? val : ''
	},
	{ immediate: true },
)

watch(
	() => filter.value.group,
	(val) => {
		selectedGroups.value = val ? (Array.isArray(val) ? val : [val]) : []
	},
	{ immediate: true },
)

// Actions
function handleSearch() {
	if (searchText.value) {
		courseSearch.setFilter('title', searchText.value)
	} else {
		courseSearch.clearFilter('title')
	}
	courseSearch.search()
}

function handleIdentFilter() {
	if (identFilter.value) {
		courseSearch.setFilter('ident', identFilter.value)
	} else {
		courseSearch.clearFilter('ident')
	}
	courseSearch.search()
}

function toggleDay(day: InSISDay) {
	courseSearch.toggleDay(day)
	courseSearch.search()
}

function isDaySelected(day: InSISDay): boolean {
	if (!filter.value.include_times) return false
	const filterDays = filter.value.include_times.map((t) => t.day)
	if (!filterDays) return false
	return Array.isArray(filterDays) ? filterDays.includes(day) : filterDays === day
}

function toggleGroup(group: InSISStudyPlanCourseGroup) {
	const current = filter.value.group ?? []
	if (current.includes(group)) {
		courseSearch.setGroupFilter(current.filter((g) => g !== group))
	} else {
		courseSearch.setGroupFilter([...current, group])
	}
	courseSearch.search()
}

function isGroupSelected(group: InSISStudyPlanCourseGroup): boolean {
	return filter.value.group?.includes(group) ?? false
}

function clearAllFilters() {
	searchText.value = ''
	identFilter.value = ''
	selectedDays.value = []
	selectedGroups.value = []
	courseSearch.clearAllFilters()
	courseSearch.search()
}
</script>

<template>
	<aside class="insis-search-panel">
		<h3 class="insis-panel-title">{{ t('filters.title') }}</h3>

		<!-- Quick Search -->
		<div class="field-group">
			<label class="insis-label">{{ t('filters.search') }}</label>
			<div class="flex gap-2">
				<input v-model="searchText" type="text" class="insis-input flex-1" :placeholder="t('filters.searchPlaceholder')" @keyup.enter="handleSearch" />
				<button class="insis-btn insis-btn-primary cursor-pointer" :disabled="isLoading" @click="handleSearch">{{ t('filters.searchButton') }}</button>
			</div>
		</div>

		<!-- Course Ident Filter -->
		<div class="field-group">
			<label class="insis-label">{{ t('filters.courseCode') }}</label>
			<input v-model="identFilter" type="text" class="insis-input" :placeholder="t('filters.courseCodePlaceholder')" @keyup.enter="handleIdentFilter" />
		</div>

		<!-- Day Filter -->
		<div class="field-group">
			<label class="insis-label">{{ t('filters.days') }}</label>
			<div class="flex flex-wrap">
				<button
					v-for="day in ALL_DAYS.slice(0, 5)"
					:key="day"
					class="insis-day-toggle cursor-pointer"
					:class="{ active: isDaySelected(day) }"
					@click="toggleDay(day)"
				>
					{{ DAY_LABELS[day].short }}
				</button>
			</div>
		</div>

		<!-- Group Filter (only when study plan selected) -->
		<div v-if="isWizardComplete" class="field-group">
			<label class="insis-label">{{ t('filters.courseType') }}</label>
			<div class="flex flex-col gap-1">
				<label v-for="(label, group) in GROUP_LABELS" :key="group" class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						class="insis-checkbox"
						:checked="isGroupSelected(group as InSISStudyPlanCourseGroup)"
						@change="toggleGroup(group as InSISStudyPlanCourseGroup)"
					/>
					<span class="text-sm">{{ label }}</span>
				</label>
			</div>
		</div>

		<!-- Faculty Filter (when no study plan selected) -->
		<div v-if="!isWizardComplete && facets?.faculties?.length" class="field-group">
			<label class="insis-label">{{ t('filters.faculty') }}</label>
			<select
				class="insis-select"
				:value="filter.faculty_id || ''"
				@change="
					(e) => {
						const val = (e.target as HTMLSelectElement).value
						if (val) courseSearch.setFilter('faculty_id', val)
						else courseSearch.clearFilter('faculty_id')
						courseSearch.search()
					}
				"
			>
				<option value="">{{ t('filters.allFaculties') }}</option>
				<option v-for="f in facets.faculties" :key="String(f.value)" :value="f.value ?? ''">{{ f.value }} ({{ f.count }})</option>
			</select>
		</div>

		<!-- ECTS Filter -->
		<div v-if="facets?.ects?.length" class="field-group">
			<label class="insis-label">{{ t('filters.credits') }}</label>
			<select
				class="insis-select"
				:value="filter.ects || ''"
				@change="
					(e) => {
						const val = (e.target as HTMLSelectElement).value
						if (val) courseSearch.setFilter('ects', Number(val))
						else courseSearch.clearFilter('ects')
						courseSearch.search()
					}
				"
			>
				<option value="">{{ t('filters.allCredits') }}</option>
				<option v-for="e in facets.ects" :key="String(e.value)" :value="e.value ?? ''">{{ e.value }} ECTS ({{ e.count }})</option>
			</select>
		</div>

		<!-- Timetable Filter -->
		<div class="field-group mt-4">
			<TimetableFilter />
		</div>

		<!-- Clear Filters -->
		<div v-if="hasActiveFilters" class="field-group mt-4 pt-4 border-t border-[var(--insis-border)]">
			<button class="insis-btn w-full cursor-pointer" @click="clearAllFilters">{{ t('filters.clearAll') }}</button>
		</div>
	</aside>
</template>
