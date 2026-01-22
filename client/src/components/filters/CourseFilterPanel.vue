<script setup lang="ts">
import FacetItem from '@api/Interfaces/FacetItem.ts'
import { FACULTIES } from '@client/constants/faculties.ts'
import { useCoursesStore } from '@client/stores/courses.ts'
import InSISDay, { InSISDayValues } from '@scraper/Types/InSISDay.ts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
	facets?: {
		faculties?: FacetItem[]
		days?: FacetItem[]
		lecturers?: FacetItem[]
		languages?: FacetItem[]
		levels?: FacetItem[]
		categories?: FacetItem[]
		groups?: FacetItem[]
		ects?: FacetItem[]
		time_range?: { min_time: number; max_time: number }
	} | null
}>()

const emit = defineEmits<{
	(e: 'filter-change'): void
}>()

const { t } = useI18n()
const coursesStore = useCoursesStore()

// Day labels
const dayLabels: Record<InSISDay, string> = {
	Po: 'Po',
	Út: 'Út',
	St: 'St',
	Čt: 'Čt',
	Pá: 'Pá',
}

// Campus options (VŠE specific)
const campuses = [
	{ id: 'zizkov', name: 'Žižkov' },
	{ id: 'jizni-mesto', name: 'Jižní Město' },
	{ id: 'jindrichuv-hradec', name: 'Jindřichův Hradec' },
]

// Time range computed values
const timeFrom = computed({
	get: () => coursesStore.filter.time_from ?? 7 * 60 + 30,
	set: (val) => {
		coursesStore.setTimeRange(val, coursesStore.filter.time_to)
		emit('filter-change')
	},
})

const timeTo = computed({
	get: () => coursesStore.filter.time_to ?? 20 * 60,
	set: (val) => {
		coursesStore.setTimeRange(coursesStore.filter.time_from, val)
		emit('filter-change')
	},
})

// Format time from minutes
function formatTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours}:${mins.toString().padStart(2, '0')}`
}

// Toggle day filter
function toggleDay(day: InSISDay) {
	coursesStore.toggleArrayFilter('day', day as unknown)
	emit('filter-change')
}

// Toggle faculty filter
function toggleFaculty(facultyId: string) {
	coursesStore.toggleArrayFilter('faculty_id', facultyId)
	emit('filter-change')
}

// Check if filter is active
function isDayActive(day: InSISDay): boolean {
	return coursesStore.filter.day?.includes(day) ?? false
}

function isFacultyActive(facultyId: string): boolean {
	return coursesStore.filter.faculty_id?.includes(facultyId) ?? false
}

// Category filter helpers
function toggleCategory(category: string) {
	coursesStore.toggleArrayFilter('category', category)
	emit('filter-change')
}

function isCategoryActive(category: string): boolean {
	return coursesStore.filter.category?.includes(category as never) ?? false
}

// Group filter helpers
function toggleGroup(group: string) {
	coursesStore.toggleArrayFilter('group', group)
	emit('filter-change')
}

function isGroupActive(group: string): boolean {
	return coursesStore.filter.group?.includes(group as never) ?? false
}
</script>

<template>
	<div class="insis-filter-panel">
		<h3 class="filter-title">{{ t('filters.title') }}</h3>

		<!-- Days filter -->
		<div class="insis-filter-group">
			<label class="filter-label">{{ t('filters.days') }}</label>
			<div class="insis-filter-chips">
				<button v-for="day in InSISDayValues" :key="day" class="insis-chip" :class="{ active: isDayActive(day) }" @click="toggleDay(day)">
					{{ dayLabels[day] }}
				</button>
			</div>
		</div>

		<!-- Time range filter -->
		<div class="insis-filter-group">
			<label class="filter-label">{{ t('filters.timeRange') }}</label>
			<div class="time-range-inputs">
				<div class="time-display">
					<span>{{ formatTime(timeFrom) }}</span>
					<span class="time-separator">–</span>
					<span>{{ formatTime(timeTo) }}</span>
				</div>
				<div class="time-sliders">
					<input type="range" v-model.number="timeFrom" :min="7 * 60" :max="20 * 60" :step="15" class="time-slider" />
					<input type="range" v-model.number="timeTo" :min="8 * 60" :max="21 * 60" :step="15" class="time-slider" />
				</div>
			</div>
		</div>

		<!-- Campus filter -->
		<div class="insis-filter-group">
			<label class="filter-label">{{ t('filters.campus') }}</label>
			<div class="checkbox-list">
				<label v-for="campus in campuses" :key="campus.id" class="insis-checkbox">
					<input type="checkbox" />
					<span>{{ campus.name }}</span>
				</label>
			</div>
		</div>

		<!-- Faculty filter -->
		<div class="insis-filter-group">
			<label class="filter-label">{{ t('filters.faculties') }}</label>
			<div class="checkbox-list">
				<label v-for="faculty in FACULTIES" :key="faculty.id" class="insis-checkbox">
					<input type="checkbox" :checked="isFacultyActive(faculty.id ?? '')" @change="toggleFaculty(faculty.id ?? '')" />
					<span>{{ faculty.id }}</span>
				</label>
			</div>
		</div>

		<!-- Course category filter (if in study plan context) -->
		<div v-if="facets?.categories?.length" class="insis-filter-group">
			<label class="filter-label">{{ t('filters.category') }}</label>
			<div class="checkbox-list">
				<label v-for="cat in facets.categories" :key="cat.value ?? ''" class="insis-checkbox">
					<input type="checkbox" :checked="isCategoryActive(String(cat.value))" @change="toggleCategory(String(cat.value))" />
					<span>{{ cat.value }} ({{ cat.count }})</span>
				</label>
			</div>
		</div>

		<!-- Course group filter (if in study plan context) -->
		<div v-if="facets?.groups?.length" class="insis-filter-group">
			<label class="filter-label">{{ t('filters.group') }}</label>
			<div class="insis-filter-chips">
				<button
					v-for="grp in facets.groups"
					:key="grp.value ?? ''"
					class="insis-chip"
					:class="{ active: isGroupActive(String(grp.value)) }"
					@click="toggleGroup(String(grp.value))"
				>
					{{ grp.value }} ({{ grp.count }})
				</button>
			</div>
		</div>

		<!-- ECTS filter -->
		<div v-if="facets?.ects?.length" class="insis-filter-group">
			<label class="filter-label">{{ t('filters.ects') }}</label>
			<div class="insis-filter-chips">
				<button
					v-for="ects in facets.ects"
					:key="ects.value ?? ''"
					class="insis-chip"
					:class="{ active: (coursesStore.filter.ects as number[])?.includes(Number(ects.value)) }"
					@click="
						coursesStore.toggleArrayFilter('ects', Number(ects.value))
						emit('filter-change')
					"
				>
					{{ ects.value }} kr.
				</button>
			</div>
		</div>

		<!-- Clear filters -->
		<div v-if="coursesStore.hasFilters" class="filter-actions">
			<button
				class="insis-btn insis-btn-small"
				@click="
					coursesStore.resetFilters()
					emit('filter-change')
				"
			>
				{{ t('filters.clear') }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.filter-title {
	font-size: 16px;
	font-weight: 500;
	margin: 0 0 16px;
	padding-bottom: 8px;
	border-bottom: 1px solid #ddd;
}

.filter-label {
	display: block;
	font-size: 13px;
	font-weight: 500;
	color: #333;
	margin-bottom: 8px;
}

.checkbox-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.time-range-inputs {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.time-display {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	background: var(--color-insis-table-row-even);
	border-radius: 4px;
	font-size: 14px;
	font-weight: 500;
}

.time-separator {
	color: #999;
}

.time-sliders {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.time-slider {
	width: 100%;
	height: 6px;
	-webkit-appearance: none;
	background: #e0e0e0;
	border-radius: 3px;
	outline: none;
}

.time-slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	width: 16px;
	height: 16px;
	background: var(--color-insis-primary);
	border-radius: 50%;
	cursor: pointer;
}

.time-slider::-moz-range-thumb {
	width: 16px;
	height: 16px;
	background: var(--color-insis-primary);
	border-radius: 50%;
	cursor: pointer;
	border: none;
}

.filter-actions {
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid #ddd;
}

.insis-btn-small {
	padding: 6px 12px;
	font-size: 12px;
}
</style>
