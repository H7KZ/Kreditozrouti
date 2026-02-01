<script setup lang="ts">
import { CourseWithRelations } from '@api/Database/types'
import CourseRowExpanded from '@client/components/courses/CourseRowExpanded.vue'
import { useCourseLabels, useScheduleSummary } from '@client/composables'
import { useCoursesStore, useTimetableStore } from '@client/stores'
import type { CourseSortBy } from '@client/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronUp from '~icons/lucide/chevron-up'

/*
 * CourseTable
 * InSIS-styled table for displaying courses with expandable rows.
 * Refactored to use composables for labels and schedule summary.
 */

const { t } = useI18n({ useScope: 'global' })
const coursesStore = useCoursesStore()
const timetableStore = useTimetableStore()

// Composables
const { getCompletionLabel, getFacultyLabel, getCourseTitle } = useCourseLabels()
const { getScheduleSummary } = useScheduleSummary()

// Column definitions for sorting
const columns = computed(() => [
	{ key: 'ident', label: t('components.courses.CourseTable.columns.code'), sortable: true },
	{ key: 'title', label: t('components.courses.CourseTable.columns.title'), sortable: true },
	{ key: 'faculty', label: t('components.courses.CourseTable.columns.faculty'), sortable: true },
	{ key: 'ects', label: t('components.courses.CourseTable.columns.ects'), sortable: true },
	{ key: 'completion', label: t('components.courses.CourseTable.columns.completion'), sortable: false },
	{ key: 'schedule', label: t('components.courses.CourseTable.columns.schedule'), sortable: false },
	{ key: 'actions', label: '', sortable: false },
])

function handleSort(key: CourseSortBy) {
	if (key === coursesStore.filters.sort_by) {
		coursesStore.toggleSortDir()
	} else {
		coursesStore.setSortBy(key)
		coursesStore.setSortDir('asc')
	}
	coursesStore.fetchCourses()
}

function handleRowClick(courseId: number) {
	coursesStore.toggleCourseExpansion(courseId)
}

function isExpanded(courseId: number): boolean {
	return coursesStore.isCourseExpanded(courseId)
}

function hasSelectedUnits(courseId: number): boolean {
	return timetableStore.hasCourseSelected(courseId)
}

function hasMissingUnitTypes(courseId: number): boolean {
	return timetableStore.courseHasMissingUnitTypes(courseId)
}

// Schedule summary using composable
function getCourseScheduleSummary(course: CourseWithRelations): string {
	return getScheduleSummary(course.units)
}
</script>

<template>
	<div class="overflow-x-auto">
		<table class="insis-table">
			<thead>
				<tr>
					<th
						v-for="col in columns"
						:key="col.key"
						:class="[
							col.sortable && 'cursor-pointer hover:bg-[var(--insis-gray-200)]',
							col.key === 'ident' && 'w-24',
							col.key === 'ects' && 'w-16 text-center',
							col.key === 'actions' && 'w-10',
						]"
						@click="col.sortable && handleSort(col.key as CourseSortBy)"
					>
						<div class="flex items-center gap-1">
							{{ col.label }}
							<template v-if="col.sortable && coursesStore.filters.sort_by === col.key">
								<IconChevronUp v-if="coursesStore.filters.sort_dir === 'asc'" class="h-3 w-3" />
								<IconChevronDown v-else class="h-3 w-3" />
							</template>
						</div>
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-if="coursesStore.courses.length === 0">
					<tr>
						<td :colspan="columns.length" class="py-8 text-center text-[var(--insis-gray-500)]">
							<template v-if="coursesStore.loading">
								<div class="insis-loading">
									<div class="insis-spinner" />
								</div>
							</template>
							<template v-else> {{ $t('components.courses.CourseTable.noResults') }} </template>
						</td>
					</tr>
				</template>

				<template v-else>
					<template v-for="course in coursesStore.courses" :key="course.id">
						<!-- Main Row -->
						<tr
							:class="[
								'insis-table-row-clickable',
								isExpanded(course.id) && 'bg-[var(--insis-row-hover)]',
								hasSelectedUnits(course.id) && 'bg-[var(--insis-success-light)]',
							]"
							@click="handleRowClick(course.id)"
						>
							<!-- Ident -->
							<td>
								<span class="insis-course-code font-medium">
									{{ course.ident }}
								</span>
							</td>

							<!-- Title -->
							<td>
								<div class="flex items-center gap-2">
									<span :title="getCourseTitle(course)" class="truncate">
										{{ getCourseTitle(course) }}
									</span>
									<span v-if="hasSelectedUnits(course.id)" class="insis-badge insis-badge-success">
										{{ $t('components.courses.CourseTable.inTimetable') }}
									</span>
									<span v-if="hasMissingUnitTypes(course.id)" class="insis-badge insis-badge-warning">
										{{ $t('components.courses.CourseTable.missingUnitTypes') }}
									</span>
								</div>
							</td>

							<!-- Faculty -->
							<td class="text-sm text-[var(--insis-gray-600)]">
								{{ course.faculty_id ? getFacultyLabel(course.faculty_id) : '-' }}
							</td>

							<!-- ECTS -->
							<td class="text-center">
								<span class="font-medium">{{ course.ects ?? '-' }}</span>
							</td>

							<!-- Completion -->
							<td class="text-sm">
								{{ course.mode_of_completion ? getCompletionLabel(course.mode_of_completion) : '-' }}
							</td>

							<!-- Schedule Summary -->
							<td class="text-sm text-[var(--insis-gray-600)]">
								{{ getCourseScheduleSummary(course) }}
							</td>

							<!-- Expand indicator -->
							<td class="text-center">
								<IconChevronDown :class="['inline h-4 w-4 transition-transform', isExpanded(course.id) && 'rotate-180']" />
							</td>
						</tr>

						<!-- Expanded Row -->
						<tr v-if="isExpanded(course.id)">
							<td :colspan="columns.length" class="bg-[var(--insis-gray-50)] p-0">
								<CourseRowExpanded :course="course" />
							</td>
						</tr>
					</template>
				</template>
			</tbody>
		</table>
	</div>
</template>
