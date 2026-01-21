<script setup lang="ts">
import { DEFAULT_TIME_FROM, DEFAULT_TIME_TO, TIMETABLE_DAYS, minutesToTime } from '@client/constants/schedule'
import type { CourseFilterState, CoursesResponse } from '@client/types/schedule'
import { computed } from 'vue'

const props = defineProps<{
	filters: CourseFilterState
	facets: CoursesResponse['facets'] | null
	loading: boolean
}>()

const emit = defineEmits<{
	'update:filters': [filters: CourseFilterState]
	search: []
	reset: []
}>()

const localFilters = computed({
	get: () => props.filters,
	set: (val) => emit('update:filters', val),
})

function toggleFilter<K extends keyof CourseFilterState>(key: K, value: CourseFilterState[K] extends (infer T)[] ? T : never) {
	const current = localFilters.value[key]
	if (!Array.isArray(current)) return

	const arr = current as (typeof value)[]
	const idx = arr.indexOf(value)
	localFilters.value = {
		...localFilters.value,
		[key]: idx === -1 ? [...arr, value] : arr.filter((v) => v !== value),
	}
}

function isChecked<K extends keyof CourseFilterState>(key: K, value: CourseFilterState[K] extends (infer T)[] ? T : never): boolean {
	const current = localFilters.value[key]
	return Array.isArray(current) && current.includes(value as never)
}

function updateField<K extends keyof CourseFilterState>(key: K, value: CourseFilterState[K]) {
	localFilters.value = { ...localFilters.value, [key]: value }
}
</script>

<template>
	<aside class="insis-card flex flex-col h-full min-w-[280px] max-w-[320px]">
		<!-- Header -->
		<div class="insis-card-header">
			<h2 class="insis-card-title text-gray-700">Filtr předmětů</h2>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4 space-y-5 insis-scrollbar">
			<!-- Search by code/name -->
			<div>
				<label class="insis-label">Kód / Název předmětu</label>
				<input
					type="text"
					:value="localFilters.ident"
					@input="updateField('ident', ($event.target as HTMLInputElement).value)"
					class="insis-input insis-input-sm"
					placeholder="např. 4IT101"
				/>
			</div>

			<!-- Days -->
			<div>
				<label class="insis-label">Dny</label>
				<div class="flex gap-1">
					<button
						v-for="day in TIMETABLE_DAYS"
						:key="day.key"
						type="button"
						@click="toggleFilter('day', day.key)"
						:class="['insis-day-btn', isChecked('day', day.key) && 'insis-day-btn-active']"
					>
						{{ day.shortLabel }}
					</button>
				</div>
			</div>

			<!-- Time range -->
			<div>
				<label class="insis-label">Čas výuky</label>
				<div class="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 mb-2">
					<span>{{ minutesToTime(localFilters.time_from) }}</span>
					<span class="text-gray-400">—</span>
					<span>{{ minutesToTime(localFilters.time_to) }}</span>
				</div>
				<input
					type="range"
					:min="DEFAULT_TIME_FROM"
					:max="DEFAULT_TIME_TO"
					:value="localFilters.time_from"
					@input="updateField('time_from', Number(($event.target as HTMLInputElement).value))"
					step="15"
					class="insis-range mb-1"
				/>
				<input
					type="range"
					:min="DEFAULT_TIME_FROM"
					:max="DEFAULT_TIME_TO"
					:value="localFilters.time_to"
					@input="updateField('time_to', Number(($event.target as HTMLInputElement).value))"
					step="15"
					class="insis-range"
				/>
			</div>

			<!-- Faculties -->
			<div v-if="facets?.faculties?.length">
				<label class="insis-label">Fakulty</label>
				<div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
					<label
						v-for="f in facets.faculties"
						:key="String(f.value)"
						class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
					>
						<input
							type="checkbox"
							:checked="isChecked('faculty', String(f.value))"
							@change="toggleFilter('faculty', String(f.value))"
							class="insis-checkbox"
						/>
						<span class="truncate">{{ f.value }}</span>
						<span class="insis-facet-count">({{ f.count }})</span>
					</label>
				</div>
			</div>

			<!-- Levels -->
			<div v-if="facets?.levels?.length">
				<label class="insis-label">Úroveň studia</label>
				<div class="space-y-1.5">
					<label
						v-for="l in facets.levels"
						:key="String(l.value)"
						class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
					>
						<input
							type="checkbox"
							:checked="isChecked('level', String(l.value))"
							@change="toggleFilter('level', String(l.value))"
							class="insis-checkbox"
						/>
						<span>{{ l.value }}</span>
						<span class="insis-facet-count">({{ l.count }})</span>
					</label>
				</div>
			</div>

			<!-- Languages -->
			<div v-if="facets?.languages?.length">
				<label class="insis-label">Jazyk výuky</label>
				<div class="space-y-1.5">
					<label
						v-for="lang in facets.languages"
						:key="String(lang.value)"
						class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
					>
						<input
							type="checkbox"
							:checked="isChecked('language', String(lang.value))"
							@change="toggleFilter('language', String(lang.value))"
							class="insis-checkbox"
						/>
						<span>{{ lang.value }}</span>
						<span class="insis-facet-count">({{ lang.count }})</span>
					</label>
				</div>
			</div>

			<!-- Semesters -->
			<div v-if="facets?.semesters?.length">
				<label class="insis-label">Semestr</label>
				<div class="space-y-1.5">
					<label
						v-for="sem in facets.semesters"
						:key="String(sem.value)"
						class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
					>
						<input
							type="checkbox"
							:checked="isChecked('semester', String(sem.value))"
							@change="toggleFilter('semester', String(sem.value))"
							class="insis-checkbox"
						/>
						<span>{{ sem.value }}</span>
						<span class="insis-facet-count">({{ sem.count }})</span>
					</label>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="insis-card-footer space-y-2">
			<button @click="emit('search')" :disabled="loading" class="insis-btn insis-btn-primary w-full">
				<span v-if="loading" class="insis-spinner"></span>
				<span v-else>Vyhledat</span>
			</button>
			<button @click="emit('reset')" :disabled="loading" class="insis-btn insis-btn-secondary w-full">Resetovat</button>
		</div>
	</aside>
</template>
