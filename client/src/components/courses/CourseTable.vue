<script setup lang="ts">
import { CourseWithRelations } from '@api/Database/types'
import CourseRowExpanded from '@client/components/courses/CourseRowExpanded.vue'
import { useCourseLabels, useScheduleSummary } from '@client/composables'
import { useCoursesStore, useFiltersStore, useTimetableStore } from '@client/stores'
import type { CourseSortBy } from '@client/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronUp from '~icons/lucide/chevron-up'

const { t } = useI18n()
const coursesStore = useCoursesStore()
const filtersStore = useFiltersStore()
const timetableStore = useTimetableStore()

const { getCompletionLabel, getFacultyLabel, getCourseTitle } = useCourseLabels()
const { getScheduleSummary } = useScheduleSummary()

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
	if (key === filtersStore.filters.sort_by) {
		filtersStore.filters.sort_dir = filtersStore.filters.sort_dir === 'asc' ? 'desc' : 'asc'
	} else {
		filtersStore.filters.sort_by = key
		filtersStore.filters.sort_dir = 'asc'
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

function hasCourseConflict(courseId: number): boolean {
	return timetableStore.courseStatuses.get(courseId)?.status === 'conflict'
}

function hasCourseCampusConflict(courseId: number): boolean {
	return timetableStore.courseStatuses.get(courseId)?.status === 'campus-conflict'
}

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
							col.sortable && 'sortable focus-visible:bg-[var(--insis-surface-2)] focus-visible:outline-none',
							col.key === 'ident' && 'w-24',
							col.key === 'ects' && 'w-16 text-center',
							col.key === 'actions' && 'w-10',
						]"
						:role="col.sortable ? 'button' : undefined"
						:tabindex="col.sortable ? 0 : undefined"
						:aria-label="col.sortable ? $t('components.courses.CourseTable.sortLabel', { column: col.label }) : undefined"
						:aria-sort="
							col.sortable && filtersStore.filters.sort_by === col.key
								? filtersStore.filters.sort_dir === 'asc'
									? 'ascending'
									: 'descending'
								: undefined
						"
						@click="col.sortable && handleSort(col.key as CourseSortBy)"
						@keydown.enter="col.sortable && handleSort(col.key as CourseSortBy)"
						@keydown.space.prevent="col.sortable && handleSort(col.key as CourseSortBy)"
					>
						<div class="flex items-center gap-1">
							{{ col.label }}
							<template v-if="col.sortable && filtersStore.filters.sort_by === col.key">
								<IconChevronUp v-if="filtersStore.filters.sort_dir === 'asc'" class="h-3 w-3" aria-hidden="true" />
								<IconChevronDown v-else class="h-3 w-3" aria-hidden="true" />
							</template>
							<span v-else-if="col.sortable" class="opacity-30 text-[10px]" aria-hidden="true">↕</span>
						</div>
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-if="coursesStore.courses.length === 0">
					<tr>
						<td :colspan="columns.length" class="py-8 text-center text-[var(--insis-text-3)]">
							<template v-if="coursesStore.loading">
								<div class="insis-loading">
									<div class="insis-spinner" aria-hidden="true" />
								</div>
							</template>
							<template v-else>{{ $t('components.courses.CourseTable.noResults') }}</template>
						</td>
					</tr>
				</template>

				<template v-else>
					<template v-for="course in coursesStore.courses" :key="course.id">
						<!-- Main Row -->
						<tr
							:class="[
								'insis-table-row-clickable focus-within:bg-[var(--insis-surface-2)] focus-within:outline-none',
								isExpanded(course.id) && 'row-expanded',
								hasSelectedUnits(course.id) && 'row-in-timetable',
							]"
							role="button"
							:tabindex="0"
							:aria-expanded="isExpanded(course.id)"
							:aria-label="$t('components.courses.CourseTable.rowLabel', { code: course.ident, title: getCourseTitle(course) })"
							@click="handleRowClick(course.id)"
							@keydown.enter="handleRowClick(course.id)"
							@keydown.space.prevent="handleRowClick(course.id)"
						>
							<!-- Ident -->
							<td>
								<span class="insis-course-code font-medium">{{ course.ident }}</span>
							</td>

							<!-- Title -->
							<td>
								<div class="flex items-center gap-2 min-w-0">
									<span :title="getCourseTitle(course)" class="truncate">{{ getCourseTitle(course) }}</span>
									<span
										v-if="hasSelectedUnits(course.id) && !hasMissingUnitTypes(course.id)"
										class="insis-badge insis-badge-success flex-shrink-0"
									>
										{{ $t('components.courses.CourseTable.inTimetable') }}
									</span>
									<span v-if="hasMissingUnitTypes(course.id)" class="insis-badge insis-badge-amber flex-shrink-0">
										{{ $t('components.courses.CourseTable.missingUnitTypes') }}
									</span>
									<span v-if="hasCourseConflict(course.id)" class="insis-badge insis-badge-danger flex-shrink-0">
										{{ $t('components.courses.CourseTable.conflictTag') }}
									</span>
									<span v-if="hasCourseCampusConflict(course.id)" class="insis-badge insis-badge-amber flex-shrink-0">
										{{ $t('components.courses.CourseTable.campusConflictTag') }}
									</span>
								</div>
							</td>

							<!-- Faculty -->
							<td class="text-[12px] text-[var(--insis-text-3)]">
								{{ course.faculty_id ? getFacultyLabel(course.faculty_id) : '-' }}
							</td>

							<!-- ECTS -->
							<td class="text-center font-medium">{{ course.ects ?? '-' }}</td>

							<!-- Completion -->
							<td class="text-[12px] text-[var(--insis-text-2)]">
								{{ course.mode_of_completion ? getCompletionLabel(course.mode_of_completion) : '-' }}
							</td>

							<!-- Schedule -->
							<td class="text-[11.5px] text-[var(--insis-text-3)]">{{ getCourseScheduleSummary(course) }}</td>

							<!-- Expand chevron -->
							<td class="text-center">
								<IconChevronDown
									:class="[
										'inline h-3.5 w-3.5 text-[var(--insis-text-3)] transition-transform duration-200',
										isExpanded(course.id) && 'rotate-180',
									]"
								/>
							</td>
						</tr>

						<!-- Expanded Row -->
						<tr v-if="isExpanded(course.id)">
							<td :colspan="columns.length" class="p-0" style="border-top: 2px solid var(--insis-blue-light)">
								<CourseRowExpanded :course="course" />
							</td>
						</tr>
					</template>
				</template>
			</tbody>
		</table>
	</div>
</template>
