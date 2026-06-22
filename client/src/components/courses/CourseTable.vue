<script setup lang="ts">
import type { CourseSortBy } from '@client/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CourseRow from '@client/components/courses/CourseRow.vue'
import CourseRowExpanded from '@client/components/courses/CourseRowExpanded.vue'
import CourseStatusIndicator from '@client/components/courses/CourseStatusIndicator.vue'
import { useCourseLabels, useScheduleSummary } from '@client/composables'
import { useCoursesStore, useFiltersStore, useTimetableStore } from '@client/stores'
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
	{ key: 'actions', label: '', sortable: false }
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

// Mobile card helpers (desktop rows are handled by CourseRow.vue)

function handleRowClick(courseId: number) {
	coursesStore.toggleCourseExpansion(courseId)
}

function isExpanded(courseId: number): boolean {
	return coursesStore.isCourseExpanded(courseId)
}

function getCourseScheduleSummary(course: { units: Parameters<typeof getScheduleSummary>[0] }): string {
	return getScheduleSummary(course.units)
}

function getMobileStatus(course: (typeof coursesStore.courses)[number]) {
	const status = timetableStore.getCourseStatus(course.id)?.status
	const isSelected = status !== undefined
	const hasPotentialConflict = !isSelected && (course.units?.some(u => timetableStore.unitHasConflicts(u)) ?? false)
	const hasPotentialCampusConflict =
		!isSelected && !hasPotentialConflict && (course.units?.some(u => !timetableStore.unitHasConflicts(u) && timetableStore.unitHasCampusConflicts(u)) ?? false)
	return {
		status,
		isSelected,
		isIncomplete: status === 'incomplete',
		hasConflict: status === 'conflict' || hasPotentialConflict,
		hasCampusConflict: status === 'campus-conflict' || hasPotentialCampusConflict,
		borderClass:
			status === 'conflict' || hasPotentialConflict
				? 'border-(--insis-danger-border)'
				: status !== undefined
					? 'border-(--insis-blue-lighter)'
					: 'border-(--insis-border)'
	}
}
</script>

<template>
	<!-- Desktop table — hidden on mobile -->
	<div class="hidden overflow-x-auto sm:block">
		<table class="insis-table">
			<thead>
				<tr>
					<th
						v-for="col in columns"
						:key="col.key"
						:class="[
							col.sortable && 'sortable focus-visible:bg-(--insis-surface-2) focus-visible:outline-none',
							col.key === 'ident' && 'w-24',
							col.key === 'ects' && 'w-16 text-center',
							col.key === 'actions' && 'w-10'
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
							<span v-else-if="col.sortable" class="text-[10px] opacity-30" aria-hidden="true">↕</span>
						</div>
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-if="coursesStore.courses.length === 0">
					<tr>
						<td :colspan="columns.length" class="py-8 text-center text-(--insis-text-3)">
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
					<CourseRow v-for="course in coursesStore.courses" :key="course.id" :course="course" :colspan="columns.length">
						<template #status-indicator>
							<CourseStatusIndicator :course-id="course.id" />
						</template>
					</CourseRow>
				</template>
			</tbody>
		</table>
	</div>

	<!-- Mobile card list — hidden on sm+ -->
	<div class="flex flex-col gap-1.5 sm:hidden">
		<!-- Empty / loading -->
		<template v-if="coursesStore.courses.length === 0">
			<div class="py-8 text-center text-(--insis-text-3)">
				<template v-if="coursesStore.loading">
					<div class="insis-loading">
						<div class="insis-spinner" aria-hidden="true" />
					</div>
				</template>
				<template v-else>{{ $t('components.courses.CourseTable.noResults') }}</template>
			</div>
		</template>

		<!-- Course cards -->
		<template v-else>
			<template v-for="course in coursesStore.courses" :key="course.id">
				<!-- Card header -->
				<div
					v-for="(ms, _i) in [getMobileStatus(course)]"
					:key="_i"
					:class="[
						'cursor-pointer rounded border bg-(--insis-surface) px-3 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-(--insis-blue) active:bg-(--insis-surface-2)',
						ms.borderClass
					]"
					role="button"
					:tabindex="0"
					:aria-expanded="isExpanded(course.id)"
					:aria-label="$t('components.courses.CourseTable.rowLabel', { code: course.ident, title: getCourseTitle(course) })"
					@click="handleRowClick(course.id)"
					@keydown.enter="handleRowClick(course.id)"
					@keydown.space.prevent="handleRowClick(course.id)"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<!-- Code + title -->
							<div class="mb-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
								<span class="shrink-0 text-[13px] font-bold text-(--insis-blue)">{{ course.ident }}</span>
								<span class="min-w-0 truncate text-[12px] font-medium text-(--insis-text)">{{ getCourseTitle(course) }}</span>
							</div>
							<!-- Faculty · ECTS · Completion -->
							<div class="text-xs text-(--insis-text-3)">
								<span v-if="course.faculty_id">{{ getFacultyLabel(course.faculty_id) }}</span>
								<template v-if="course.faculty_id && course.ects"> · </template>
								<span v-if="course.ects">{{ course.ects }} ECTS</span>
								<template v-if="course.mode_of_completion && (course.faculty_id || course.ects)"> · </template>
								<span v-if="course.mode_of_completion">{{ getCompletionLabel(course.mode_of_completion) }}</span>
							</div>
							<!-- Schedule -->
							<div v-if="getCourseScheduleSummary(course)" class="mt-0.5 text-xs text-(--insis-text-3)">
								{{ getCourseScheduleSummary(course) }}
							</div>
						</div>
						<!-- Status badges + chevron -->
						<div class="flex shrink-0 flex-col items-end gap-1">
							<span v-if="ms.status === 'selected'" class="insis-badge insis-badge-success text-xs">
								{{ $t('components.courses.CourseTable.inTimetable') }}
							</span>
							<span v-if="ms.isIncomplete" class="insis-badge insis-badge-amber text-xs">
								{{ $t('components.courses.CourseTable.missingUnitTypes') }}
							</span>
							<span v-if="ms.hasConflict" class="insis-badge insis-badge-danger text-xs">
								{{ $t('components.courses.CourseTable.conflictTag') }}
							</span>
							<span v-if="ms.hasCampusConflict" class="insis-badge insis-badge-amber text-xs">
								{{ $t('components.courses.CourseTable.campusConflictTag') }}
							</span>
							<IconChevronDown
								:class="['mt-auto h-3.5 w-3.5 text-(--insis-text-3) transition-transform duration-200', isExpanded(course.id) && 'rotate-180']"
								aria-hidden="true"
							/>
						</div>
					</div>
				</div>

				<!-- Expanded panel -->
				<div v-if="isExpanded(course.id)" class="-mt-1 rounded border border-(--insis-blue-light) bg-(--insis-surface-2)">
					<CourseRowExpanded :course="course" />
				</div>
			</template>
		</template>
	</div>
</template>
