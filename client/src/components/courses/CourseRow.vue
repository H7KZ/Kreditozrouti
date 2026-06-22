<script setup lang="ts">
import type { CourseStatus } from '@client/types'
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import { computed } from 'vue'
import CourseRowExpanded from '@client/components/courses/CourseRowExpanded.vue'
import CourseStatusIndicator from '@client/components/courses/CourseStatusIndicator.vue'
import { useCourseLabels, useScheduleSummary } from '@client/composables'
import { useCoursesStore, useTimetableStore } from '@client/stores'
import IconChevronDown from '~icons/lucide/chevron-down'

interface Props {
	course: CourseWithRelationsDTO
	colspan: number
}

const props = defineProps<Props>()

const coursesStore = useCoursesStore()
const timetableStore = useTimetableStore()

const { getCourseTitle, getFacultyLabel, getCompletionLabel } = useCourseLabels()
const { getScheduleSummary } = useScheduleSummary()

// Status

/** Full CourseStatus for this course, or undefined if not in the timetable. */
const courseStatus = computed<CourseStatus | undefined>(() => timetableStore.getCourseStatus(props.course.id))

/** Whether the course has any selected units. */
const isSelected = computed(() => courseStatus.value !== undefined)

// Row state

const isExpanded = computed(() => coursesStore.isCourseExpanded(props.course.id))

const scheduleSummary = computed(() => getScheduleSummary(props.course.units))

// Handlers

function handleRowClick() {
	coursesStore.toggleCourseExpansion(props.course.id)
}
</script>

<template>
	<!-- Main row -->
	<tr
		:class="[
			'group/row insis-table-row-clickable focus-within:bg-(--insis-surface-2) focus-within:outline-none',
			isExpanded && 'row-expanded',
			isSelected && 'row-in-timetable'
		]"
		role="button"
		:tabindex="0"
		:aria-expanded="isExpanded"
		:aria-label="$t('components.courses.CourseTable.rowLabel', { code: course.ident, title: getCourseTitle(course) })"
		@click="handleRowClick"
		@keydown.enter="handleRowClick"
		@keydown.space.prevent="handleRowClick"
	>
		<!-- Ident -->
		<td>
			<span class="insis-course-code font-medium">{{ course.ident }}</span>
		</td>

		<!-- Title + status badges -->
		<td>
			<div class="flex min-w-0 items-center gap-2">
				<span :title="getCourseTitle(course)" class="truncate">{{ getCourseTitle(course) }}</span>
				<CourseStatusIndicator :course="course" />
			</div>
		</td>

		<!-- Faculty -->
		<td class="text-[12px] text-(--insis-text-3)">
			{{ course.faculty_id ? getFacultyLabel(course.faculty_id) : '-' }}
		</td>

		<!-- ECTS -->
		<td class="text-center font-medium">{{ course.ects ?? '-' }}</td>

		<!-- Completion -->
		<td class="text-[12px] text-(--insis-text-2)">
			{{ course.mode_of_completion ? getCompletionLabel(course.mode_of_completion) : '-' }}
		</td>

		<!-- Schedule -->
		<td class="text-[11.5px] text-(--insis-text-3)">{{ scheduleSummary }}</td>

		<!-- Actions: expand chevron -->
		<td class="text-right">
			<div class="flex items-center justify-end gap-1">
				<IconChevronDown
					:class="['inline h-3.5 w-3.5 shrink-0 text-(--insis-text-3) transition-transform duration-200', isExpanded && 'rotate-180']"
					aria-hidden="true"
				/>
			</div>
		</td>
	</tr>

	<!-- Expanded row -->
	<tr v-if="isExpanded">
		<td :colspan="colspan" class="p-0" style="border-top: 2px solid var(--insis-blue-light)">
			<CourseRowExpanded :course="course" />
		</td>
	</tr>
</template>
