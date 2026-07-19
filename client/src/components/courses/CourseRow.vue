<script setup lang="ts">
import type { CourseStatus } from '@client/types'
import type { FitResult } from '@client/composables/useFitScore'
import type { CourseWithRelationsDTO } from '@kreditozrouti/types'
import { computed } from 'vue'
import CourseRowExpanded from '@client/components/courses/CourseRowExpanded.vue'
import CourseStatusIndicator from '@client/components/courses/CourseStatusIndicator.vue'
import { useCourseLabels, useOptimizerBasket, useScheduleSummary } from '@client/composables'
import { useCoursesStore, useTimetableStore } from '@client/stores'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconSparkles from '~icons/lucide/sparkles'

interface Props {
	course: CourseWithRelationsDTO
	colspan: number
	fitScores?: Map<number, FitResult>
}

const props = defineProps<Props>()

const coursesStore = useCoursesStore()
const timetableStore = useTimetableStore()
const { has: inBasket, add: addToBasket, remove: removeFromBasket } = useOptimizerBasket()

const { getCourseTitle, getFacultyLabel, getCompletionLabel } = useCourseLabels()
const { getScheduleSummary } = useScheduleSummary()

// Fit score

const fitResult = computed(() => props.fitScores?.get(props.course.id))

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
				<span
					v-if="fitResult && fitResult.score > -Infinity"
					:class="[
						'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
						fitResult.fitReason === 'fills_gap'
							? 'bg-green-100 text-green-700'
							: fitResult.fitReason === 'same_day'
								? 'bg-blue-100 text-blue-700'
								: 'bg-(--insis-gray-100) text-(--insis-text-3)'
					]"
					:title="$t('components.courses.CourseTable.fitsTimetable')"
					aria-hidden="true"
				>
					{{ fitResult.fitReason === 'fills_gap' ? '★★' : fitResult.fitReason === 'same_day' ? '★' : '~' }}
				</span>
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

		<!-- Actions: optimizer toggle + expand chevron -->
		<td class="text-right">
			<div class="flex items-center justify-end gap-1">
				<button
					type="button"
					:class="[
						'inline-flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] transition-colors',
						inBasket(course.id)
							? 'border-(--insis-blue) text-(--insis-blue)'
							: 'border-transparent text-(--insis-text-3) hover:border-(--insis-border) hover:text-(--insis-text-2)'
					]"
					:aria-label="$t('components.courses.CourseTable.optimizerToggle')"
					:aria-pressed="inBasket(course.id)"
					@click.stop="inBasket(course.id) ? removeFromBasket(course.id) : addToBasket(course.id)"
				>
					<IconSparkles class="h-3 w-3" aria-hidden="true" />
				</button>
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
