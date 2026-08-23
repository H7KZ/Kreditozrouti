<script setup lang="ts">
import type { CourseStatus } from '@client/types'
import type { FitChip, FitResult } from '@client/composables/useFitScore'
import type { CourseWithRelationsDTO } from '@kreditozrouti/types'
import { computed } from 'vue'
import CourseRowExpanded from '@client/components/courses/CourseRowExpanded.vue'
import CourseStatusIndicator from '@client/components/courses/CourseStatusIndicator.vue'
import { useCourseLabels, useOptimizerBasket, useScheduleSummary } from '@client/composables'
import { fitChipFor } from '@client/composables/useFitScore'
import { useCoursesStore, useTimetableStore } from '@client/stores'
import IconCalendarCheck from '~icons/lucide/calendar-check'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconPuzzle from '~icons/lucide/puzzle'
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

/** Which fit chip to show (if any) for this row. Null = no chip. */
const fitChip = computed<FitChip | null>(() => (fitResult.value ? fitChipFor(fitResult.value.fitReason) : null))

// Icon + style per chip in one place. Both chips are positive (green family,
// no good/bad ramp) and differentiated by fill weight + icon + label, kept
// deliberately distinct from the optimizer's bordered uppercase tier pills.
const FIT_CHIP: Record<FitChip, { icon: typeof IconPuzzle; class: string }> = {
	fills_gap: { icon: IconPuzzle, class: 'bg-(--insis-success) text-white' },
	same_day: { icon: IconCalendarCheck, class: 'bg-(--insis-success-light) text-(--insis-success)' }
}

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
		@click="handleRowClick"
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
					v-if="fitChip"
					:class="['inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium', FIT_CHIP[fitChip].class]"
				>
					<component :is="FIT_CHIP[fitChip].icon" class="h-2.5 w-2.5" aria-hidden="true" />
					{{ $t(`components.courses.CourseTable.fitChip.${fitChip}`) }}
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
				<button
					type="button"
					class="inline-flex cursor-pointer items-center rounded border border-transparent p-0.5 text-(--insis-text-3) transition-colors hover:text-(--insis-text-2)"
					:aria-expanded="isExpanded"
					:aria-label="$t('components.courses.CourseTable.rowLabel', { code: course.ident, title: getCourseTitle(course) })"
					@click.stop="handleRowClick"
				>
					<IconChevronDown
						:class="['h-3.5 w-3.5 shrink-0 transition-transform duration-200', isExpanded && 'rotate-180']"
						aria-hidden="true"
					/>
				</button>
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
