<script setup lang="ts">
import { useCourseFilters } from '@client/stores/courseFilters'
import type { FacetItem } from '@shared/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FilterSection from './FilterSection.vue'
import TimeFilterModal from './TimeFilterModal.vue'

interface Props {
	facets?: {
		faculties?: FacetItem[]
		days?: FacetItem[]
		groups?: FacetItem[]
		lecturers?: FacetItem[]
		languages?: FacetItem[]
		levels?: FacetItem[]
	}
	loading?: boolean
}

withDefaults(defineProps<Props>(), {
	loading: false,
})

const { t } = useI18n()
const filters = useCourseFilters()

// Modal state
const showTimeModal = ref(false)

// Days mapping
const days = [
	{ value: 'Po', label: t('courses.days.monday') },
	{ value: 'Út', label: t('courses.days.tuesday') },
	{ value: 'St', label: t('courses.days.wednesday') },
	{ value: 'Čt', label: t('courses.days.thursday') },
	{ value: 'Pá', label: t('courses.days.friday') },
]

// Groups mapping
const groups = [
	{ value: 'c', label: t('courses.groups.compulsory') },
	{ value: 'cv', label: t('courses.groups.compulsoryElective') },
	{ value: 'v', label: t('courses.groups.elective') },
]

// Time filter display text
const timeFilterText = computed(() => {
	if (filters.timeFrom === null && filters.timeTo === null) return null

	const formatTime = (mins: number) => {
		const h = Math.floor(mins / 60)
		const m = mins % 60
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
	}

	let text = ''
	if (filters.timeDay) text += `${filters.timeDay} `
	if (filters.timeFrom !== null) text += formatTime(filters.timeFrom)
	if (filters.timeTo !== null) text += ` - ${formatTime(filters.timeTo)}`
	return text
})
</script>

<template>
	<aside class="filter-panel w-72 flex-shrink-0 bg-white border-r border-[#e5e7eb] overflow-y-auto h-full">
		<div class="p-4">
			<!-- Header -->
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-semibold text-[#374151] uppercase tracking-wider">
					{{ t('filters.title') }}
				</h2>
				<button v-if="filters.hasActiveFilters" class="text-xs text-[#4a7eb8] hover:text-[#2c5a8c] cursor-pointer" @click="filters.clearAllFilters()">
					{{ t('app.clearAll') }}
				</button>
			</div>

			<!-- Active filter count -->
			<div v-if="filters.activeFilterCount > 0" class="mb-4">
				<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#4a7eb8] text-white">
					{{ filters.activeFilterCount }} {{ filters.activeFilterCount === 1 ? t('filters.activeFilterSingular') : t('filters.activeFilterPlural') }}
				</span>
			</div>

			<!-- Search -->
			<div class="mb-4">
				<label class="block text-xs font-medium text-[#6b7280] mb-1.5">
					{{ t('app.search') }}
				</label>
				<input
					:value="filters.searchQuery"
					type="text"
					:placeholder="t('filters.searchPlaceholder')"
					class="insis-input w-full text-sm"
					@input="filters.setSearchQuery(($event.target as HTMLInputElement).value)"
				/>
			</div>

			<!-- Time Filter Button (opens modal) -->
			<div class="mb-4">
				<label class="block text-xs font-medium text-[#6b7280] mb-1.5">
					{{ t('filters.timeRange') }}
				</label>
				<button class="insis-btn w-full flex items-center justify-between cursor-pointer" @click="showTimeModal = true">
					<span v-if="timeFilterText" class="text-[#1f2937]">{{ timeFilterText }}</span>
					<span v-else class="text-[#9ca3af]">{{ t('filters.openCalendar') }}</span>
					<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</button>
				<button
					v-if="filters.timeFrom !== null || filters.timeTo !== null"
					class="text-xs text-[#ef4444] hover:underline mt-1 cursor-pointer"
					@click="filters.clearTimeFilter()"
				>
					{{ t('filters.clearTimeFilter') }}
				</button>
			</div>

			<!-- Day Filter -->
			<FilterSection :title="t('filters.day')" :items="days" :selected="filters.selectedDays" @toggle="filters.toggleDay($event as any)" />

			<!-- Group Filter -->
			<FilterSection :title="t('filters.group')" :items="groups" :selected="filters.selectedGroups" @toggle="filters.toggleGroup($event as any)" />

			<!-- Faculty Filter (from facets) -->
			<FilterSection
				v-if="facets?.faculties?.length"
				:title="t('filters.faculty')"
				:items="facets.faculties.map((f) => ({ value: String(f.value), label: String(f.value), count: f.count }))"
				:selected="filters.selectedFaculties"
				:show-counts="true"
				@toggle="filters.toggleFaculty($event)"
			/>

			<!-- Credits Range -->
			<div class="mb-4">
				<label class="block text-xs font-medium text-[#6b7280] mb-1.5">
					{{ t('filters.credits') }}
				</label>
				<div class="flex gap-2 items-center">
					<input
						:value="filters.creditsMin ?? ''"
						type="number"
						min="0"
						max="30"
						:placeholder="t('filters.creditsMin')"
						class="insis-input w-full text-sm"
						@input="filters.creditsMin = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
					/>
					<span class="text-[#9ca3af]">-</span>
					<input
						:value="filters.creditsMax ?? ''"
						type="number"
						min="0"
						max="30"
						:placeholder="t('filters.creditsMax')"
						class="insis-input w-full text-sm"
						@input="filters.creditsMax = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
					/>
				</div>
			</div>

			<!-- Lecturer Filter (from facets) -->
			<FilterSection
				v-if="facets?.lecturers?.length"
				:title="t('filters.lecturer')"
				:items="facets.lecturers.slice(0, 50).map((l) => ({ value: String(l.value), label: String(l.value), count: l.count }))"
				:selected="filters.selectedLecturers"
				:show-counts="true"
				:collapsible="true"
				:collapsed-count="5"
				@toggle="filters.toggleLecturer($event)"
			/>
		</div>

		<!-- Time Filter Modal -->
		<TimeFilterModal
			v-model:open="showTimeModal"
			:initial-from="filters.timeFrom"
			:initial-to="filters.timeTo"
			:initial-day="filters.timeDay"
			@apply="({ from, to, day }) => filters.setTimeFilter(from, to, day)"
		/>
	</aside>
</template>
