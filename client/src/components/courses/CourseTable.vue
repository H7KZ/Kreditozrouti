<script setup lang="ts">
/**
 * CourseTable
 * InSIS-styled table for displaying courses with expandable rows.
 */
import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronUp from '~icons/lucide/chevron-up'

import { Course, CourseAssessment, CourseUnit, CourseUnitSlot, Faculty, StudyPlanCourse } from '@api/Database/types'
import CourseRowExpanded from '@client/components/courses/CourseRowExpanded.vue'
import { useCoursesStore, useTimetableStore } from '@client/stores'
import { CourseSortBy } from '@client/types'

type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

const coursesStore = useCoursesStore()
const timetableStore = useTimetableStore()

// Column definitions for sorting
const columns = [
	{ key: 'ident', label: 'Kód', sortable: true },
	{ key: 'title', label: 'Název', sortable: true },
	{ key: 'faculty', label: 'Fakulta', sortable: true },
	{ key: 'ects', label: 'ECTS', sortable: true },
	{ key: 'completion', label: 'Ukončení', sortable: false },
	{ key: 'schedule', label: 'Rozvrh', sortable: false },
	{ key: 'actions', label: '', sortable: false },
]

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

// Get schedule summary for a course
function getScheduleSummary(course: CourseWithRelations): string {
	if (!course.units || course.units.length === 0) return '-'

	const daysSet = new Set<string>()
	for (const unit of course.units) {
		if (unit.slots) {
			for (const slot of unit.slots) {
				if (slot.day) {
					// Short day name
					const dayShort = slot.day.substring(0, 2)
					daysSet.add(dayShort)
				}
			}
		}
	}

	return daysSet.size > 0 ? [...daysSet].join(', ') : '-'
}

// Get mode of completion display
function getCompletionLabel(course: CourseWithRelations): string {
	return course.mode_of_completion || '-'
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
							<template v-else> Žádné předměty neodpovídají filtru </template>
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
									<span :title="String(course.title)" class="truncate">
										{{ course.title }}
									</span>
									<span v-if="hasSelectedUnits(course.id)" class="insis-badge insis-badge-success"> V rozvrhu </span>
								</div>
							</td>

							<!-- Faculty -->
							<td class="text-sm text-[var(--insis-gray-600)]">
								{{ course.faculty?.title || course.faculty_id || '-' }}
							</td>

							<!-- ECTS -->
							<td class="text-center">
								<span class="font-medium">{{ course.ects ?? '-' }}</span>
							</td>

							<!-- Completion -->
							<td class="text-sm">
								{{ getCompletionLabel(course) }}
							</td>

							<!-- Schedule Summary -->
							<td class="text-sm text-[var(--insis-gray-600)]">
								{{ getScheduleSummary(course) }}
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
