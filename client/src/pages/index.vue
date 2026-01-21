<script setup lang="ts">
import { useCoursesSearch, useScheduleBuilder } from '@client/composables/useSchedule.ts'
import { useAlertsStore } from '@client/stores/alerts'
import type { Course } from '@client/types'
import { onMounted, ref } from 'vue'

import CourseFilterSidebar from '@client/components/schedule/CourseFilterSidebar.vue'
import CourseList from '@client/components/schedule/CourseList.vue'
import ScheduleSummary from '@client/components/schedule/ScheduleSummary.vue'
import TimetableGrid from '@client/components/schedule/TimetableGrid.vue'

// Composables
const { courses, facets, loading, filters, totalCount, hasMore, fetchCourses, loadMore, resetFilters } = useCoursesSearch()

const { scheduledCourses, scheduledCourseIds, totalCredits, totalHours, addToSchedule, removeFromSchedule, clearSchedule } = useScheduleBuilder()

const alerts = useAlertsStore()

// Local state
const highlightedCourse = ref<Course | null>(null)
const activeView = ref<'timetable' | 'list'>('timetable')

// Handlers
async function handleSearch() {
	await fetchCourses(20, 0)
}

function handleReset() {
	resetFilters()
	courses.value = []
}

function handleAddToSchedule(course: Course, timeSlotIndex: number) {
	try {
		addToSchedule(course, timeSlotIndex)
		alerts.addAlert({
			type: 'success',
			title: 'Přidáno do rozvrhu',
			description: `${course.ident} - ${course.title}`,
			timeout: 3000,
		})
	} catch (err) {
		alerts.addAlert({
			type: 'error',
			title: 'Nelze přidat',
			description: err instanceof Error ? err.message : 'Neznámá chyba',
			timeout: 5000,
		})
	}
}

function handleRemoveCourse(courseId: number, timeSlotIndex: number) {
	removeFromSchedule(courseId, timeSlotIndex)
}

function handleClearSchedule() {
	if (confirm('Opravdu chcete vymazat celý rozvrh?')) {
		clearSchedule()
	}
}

function handleExportSchedule() {
	alerts.addAlert({
		type: 'info',
		title: 'Export',
		description: 'Export rozvrhu bude brzy k dispozici.',
		timeout: 3000,
	})
}

// Initial load
onMounted(() => {
	fetchCourses(20, 0)
})
</script>

<route lang="json">
{
	"name": "app/schedule"
}
</route>

<template>
	<div class="min-h-screen flex flex-col" style="background: var(--insis-gray-100)">
		<!-- Header -->
		<header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
			<div class="flex items-center gap-4">
				<!-- Logo placeholder -->
				<div class="w-12 h-12 rounded flex items-center justify-center text-white text-sm font-bold" style="background: var(--insis-primary)">VŠE</div>
				<div class="border-l border-gray-300 pl-4">
					<h1 class="text-xl font-semibold m-0" style="color: var(--insis-primary)">Tvorba rozvrhu</h1>
					<p class="text-sm text-gray-500 m-0">Kreditožrouti - LS 2025/2026</p>
				</div>
			</div>

			<!-- View toggle -->
			<div class="flex bg-gray-100 rounded-sm p-0.5">
				<button
					@click="activeView = 'timetable'"
					:class="[
						'px-4 py-1.5 text-sm font-medium rounded-sm transition-colors',
						activeView === 'timetable' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-800',
					]"
					:style="activeView === 'timetable' ? { color: 'var(--insis-primary)' } : {}"
				>
					Rozvrh
				</button>
				<button
					@click="activeView = 'list'"
					:class="[
						'px-4 py-1.5 text-sm font-medium rounded-sm transition-colors',
						activeView === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-800',
					]"
					:style="activeView === 'list' ? { color: 'var(--insis-primary)' } : {}"
				>
					Seznam
				</button>
			</div>
		</header>

		<!-- Main content -->
		<div class="flex-1 flex gap-4 p-4 max-w-[1920px] mx-auto w-full">
			<!-- Left sidebar - Filters -->
			<CourseFilterSidebar v-model:filters="filters" :facets="facets" :loading="loading" @search="handleSearch" @reset="handleReset" />

			<!-- Center - Main content -->
			<main class="flex-1 min-w-0 space-y-4">
				<!-- Timetable view -->
				<template v-if="activeView === 'timetable'">
					<TimetableGrid :scheduled-courses="scheduledCourses" :highlighted-course="highlightedCourse" @remove-course="handleRemoveCourse" />

					<CourseList
						:courses="courses"
						:loading="loading"
						:has-more="hasMore"
						:total-count="totalCount"
						:scheduled-course-ids="scheduledCourseIds"
						@load-more="loadMore"
						@add-to-schedule="handleAddToSchedule"
						@highlight-course="(c) => (highlightedCourse = c)"
					/>
				</template>

				<!-- List view -->
				<template v-else>
					<CourseList
						:courses="courses"
						:loading="loading"
						:has-more="hasMore"
						:total-count="totalCount"
						:scheduled-course-ids="scheduledCourseIds"
						@load-more="loadMore"
						@add-to-schedule="handleAddToSchedule"
						@highlight-course="(c) => (highlightedCourse = c)"
					/>
				</template>
			</main>

			<!-- Right sidebar - Schedule summary -->
			<div class="w-72 flex-shrink-0">
				<ScheduleSummary
					:scheduled-courses="scheduledCourses"
					:total-credits="totalCredits"
					:total-hours="totalHours"
					@remove-course="handleRemoveCourse"
					@clear-schedule="handleClearSchedule"
					@export-schedule="handleExportSchedule"
				/>
			</div>
		</div>
	</div>
</template>
