<script setup lang="ts">
import type { CourseWithRelations } from '@api/contracts'
import { useCourseLabels } from '@client/composables'
import CourseRefreshButton from '@client/components/courses/CourseRefreshButton.vue'
import { useCompletedCoursesStore, useCoursesStore } from '@client/stores'
import { formatRelativeAge, isCourseStale } from '@client/utils/freshness'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCircleCheck from '~icons/lucide/circle-check'
import IconClock from '~icons/lucide/clock'
import IconExternalLink from '~icons/lucide/external-link'

interface Props {
	course: CourseWithRelations
}

const props = defineProps<Props>()

const coursesStore = useCoursesStore()
const completedCoursesStore = useCompletedCoursesStore()

const { locale } = useI18n()
const { getCompletionLabel, getFacultyLabel, getLanguagesLabel, getCategoryLabel, getCourseTitle, getCategoryBadgeClass } = useCourseLabels()

const isMarkedCompleted = computed(() => completedCoursesStore.isCourseCompleted(props.course.ident))
const formattedAge = computed(() => formatRelativeAge(props.course.updated_at, locale.value))

function handleToggleCompleted() {
	coursesStore.toggleCompletedCourse(props.course.ident)
}
</script>

<template>
	<div>
		<h3 class="mb-3 flex items-center gap-1.5 font-medium text-[var(--insis-gray-900)]">
			{{ course.ident }} - {{ getCourseTitle(course) }}
			<a
				v-if="course.url"
				:href="course.url"
				target="_blank"
				rel="noopener noreferrer"
				class="text-[var(--insis-blue)] hover:text-[var(--insis-blue-dark)]"
				:aria-label="$t('common.openInInsis')"
				:title="$t('common.openInInsis')"
			>
				<IconExternalLink class="h-3 w-3" aria-hidden="true" />
			</a>
		</h3>

		<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
			<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.faculty') }}</dt>
			<dd>{{ course.faculty_id ? getFacultyLabel(course.faculty_id) : '-' }}</dd>

			<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.ectsCredits') }}</dt>
			<dd class="font-medium">{{ course.ects ?? '-' }}</dd>

			<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.completion') }}</dt>
			<dd>{{ course.mode_of_completion ? getCompletionLabel(course.mode_of_completion) : '-' }}</dd>

			<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.language') }}</dt>
			<dd>{{ getLanguagesLabel(course.languages) }}</dd>

			<template v-if="course.study_plans?.length">
				<dt class="text-[var(--insis-gray-500)]">{{ $t('components.courses.CourseRowExpanded.category') }}</dt>
				<dd>
					<span v-for="spc in course.study_plans" :key="spc.id" class="insis-badge mr-1" :class="getCategoryBadgeClass(spc.category || '')">
						{{ getCategoryLabel(spc.category || '') }}
					</span>
				</dd>
			</template>
		</dl>

		<!-- Assessments -->
		<div v-if="course.assessments?.length" class="mt-4">
			<h4 class="mb-2 text-sm font-medium text-[var(--insis-gray-700)]">
				{{ $t('components.courses.CourseRowExpanded.assessments') }}
			</h4>
			<ul class="space-y-1 text-sm">
				<li v-for="assessment in course.assessments" :key="assessment.id">{{ assessment.method }}: {{ assessment.weight }}%</li>
			</ul>
		</div>

		<!-- Data freshness -->
		<div class="mt-3 flex items-center justify-between border-t border-[var(--insis-border-light)] pt-3">
			<span
				class="flex items-center gap-1 text-xs"
				:class="isCourseStale(course.updated_at) ? 'text-[var(--insis-warning)]' : 'text-[var(--insis-text-3)]'"
			>
				<IconClock class="h-3 w-3" aria-hidden="true" />
				{{ formattedAge }}
			</span>
			<CourseRefreshButton :course-id="course.id" />
		</div>

		<!-- Mark as completed -->
		<div class="mt-4 border-t border-[var(--insis-border-light)] pt-3">
			<button
				type="button"
				:class="[
					'flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors cursor-pointer',
					isMarkedCompleted
						? 'border-[var(--insis-success)] bg-[var(--insis-success-light)] text-[var(--insis-success)]'
						: 'border-[var(--insis-border)] bg-white text-[var(--insis-gray-600)] hover:border-[var(--insis-success)] hover:bg-[var(--insis-success-light)]',
				]"
				:aria-label="
					isMarkedCompleted ? $t('components.courses.CourseRowExpanded.markedCompleted') : $t('components.courses.CourseRowExpanded.markAsCompleted')
				"
				@click="handleToggleCompleted"
			>
				<IconCircleCheck :class="['h-4 w-4', isMarkedCompleted ? 'text-[var(--insis-success)]' : 'text-[var(--insis-gray-400)]']" aria-hidden="true" />
				{{
					isMarkedCompleted ? $t('components.courses.CourseRowExpanded.markedCompleted') : $t('components.courses.CourseRowExpanded.markAsCompleted')
				}}
			</button>
		</div>
	</div>
</template>
