<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import { computed } from 'vue'
import { marked } from 'marked'
import { useI18n } from 'vue-i18n'
import CourseRefreshButton from '@client/components/courses/CourseRefreshButton.vue'
import { useCourseLabels } from '@client/composables'
import { useCompletedCoursesStore, useCoursesStore, useFiltersStore } from '@client/stores'
import { formatRelativeAge, isCourseStale } from '@client/utils/freshness'
import IconCircleCheck from '~icons/lucide/circle-check'
import IconClock from '~icons/lucide/clock'
import IconExternalLink from '~icons/lucide/external-link'

interface Props {
	course: CourseWithRelationsDTO
}

const props = defineProps<Props>()

const coursesStore = useCoursesStore()
const completedCoursesStore = useCompletedCoursesStore()
const filtersStore = useFiltersStore()

const { locale, t } = useI18n()
const { getCompletionLabel, getFacultyLabel, getLanguagesLabel, getCategoryLabel, getCourseTitle, getCategoryBadgeClass } = useCourseLabels()

const isMarkedCompleted = computed(() => completedCoursesStore.isCourseCompleted(props.course.ident))
const formattedAge = computed(() => formatRelativeAge(props.course.updated_at, locale.value))

type SyllabusField = { key: string; label: string; value: string }

const sortedAssessments = computed(() => [...(props.course.assessments ?? [])].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)))

const syllabusFields = computed((): SyllabusField[] => {
	const c = props.course
	const isEn = locale.value === 'en'
	const pick = (cs: string | null, en: string | null) => (isEn && en ? en : cs)
	const rows: { key: string; labelKey: string; value: string | null }[] = [
		{ key: 'aims', labelKey: 'syllabusAims', value: pick(c.aims_of_the_course, c.aims_of_the_course_en) },
		{ key: 'outcomes', labelKey: 'syllabusLearningOutcomes', value: pick(c.learning_outcomes, c.learning_outcomes_en) },
		{ key: 'contents', labelKey: 'syllabusCourseContents', value: pick(c.course_contents, c.course_contents_en) },
		{ key: 'prereqs', labelKey: 'syllabusPrerequisites', value: pick(c.prerequisites, c.prerequisites_en) },
		{ key: 'litReq', labelKey: 'syllabusLiteratureRequired', value: pick(c.literature_required, c.literature_required_en) },
		{ key: 'litRec', labelKey: 'syllabusLiteratureRecommended', value: pick(c.literature_recommended, c.literature_recommended_en) },
		{ key: 'special', labelKey: 'syllabusSpecialRequirements', value: pick(c.special_requirements, c.special_requirements_en) },
		{ key: 'recProg', labelKey: 'syllabusRecommendedProgrammes', value: pick(c.recommended_programmes, c.recommended_programmes_en) },
		{ key: 'workExp', labelKey: 'syllabusRequiredWorkExperience', value: pick(c.required_work_experience, c.required_work_experience_en) }
	]
	return rows.filter(r => r.value).map(r => ({ key: r.key, label: t(`components.courses.CourseRowExpanded.${r.labelKey}`), value: r.value! }))
})

const hasPrerequisiteChips = computed(
	() =>
		!!(
			props.course.blocked_by_course_idents?.length ||
			props.course.excluded_after_course_idents?.length ||
			props.course.concurrent_exclusion_idents?.length ||
			props.course.recommended_before_course_idents?.length
		)
)

function filterByIdent(ident: string) {
	filtersStore.filters.idents = [ident]
	coursesStore.fetchCourses()
}

function handleToggleCompleted() {
	coursesStore.toggleCompletedCourse(props.course.ident)
}
</script>

<template>
	<div>
		<!-- Title -->
		<h3 class="mb-3 flex items-center gap-1.5 font-medium text-(--insis-gray-900)">
			{{ course.ident }} - {{ getCourseTitle(course) }}
			<a
				v-if="course.url"
				:href="course.url"
				target="_blank"
				rel="noopener noreferrer"
				class="text-(--insis-blue) hover:text-(--insis-blue-dark)"
				:aria-label="$t('common.openInInsis')"
				:title="$t('common.openInInsis')"
			>
				<IconExternalLink class="h-3 w-3" aria-hidden="true" />
			</a>
		</h3>

		<!-- Scannable strip: ECTS · completion · language -->
		<div class="mb-3 flex flex-wrap gap-1.5">
			<span
				v-if="course.ects != null"
				class="inline-flex items-center rounded-full bg-(--insis-blue)/10 px-2.5 py-0.5 text-xs font-semibold text-(--insis-blue)"
			>
				{{ course.ects }} ECTS
			</span>
			<span
				v-if="course.mode_of_completion"
				class="inline-flex items-center rounded-full bg-(--insis-gray-100) px-2.5 py-0.5 text-xs text-(--insis-gray-700)"
			>
				{{ getCompletionLabel(course.mode_of_completion) }}
			</span>
			<span
				v-if="course.languages?.length"
				class="inline-flex items-center rounded-full bg-(--insis-gray-100) px-2.5 py-0.5 text-xs text-(--insis-gray-700)"
			>
				{{ getLanguagesLabel(course.languages) }}
			</span>
		</div>

		<!-- Mark as completed — promoted above the fold -->
		<div class="mb-4">
			<button
				type="button"
				:class="[
					'flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-colors',
					isMarkedCompleted
						? 'border-(--insis-success) bg-(--insis-success-light) text-(--insis-success)'
						: 'border-(--insis-border) bg-(--insis-surface) text-(--insis-gray-600) hover:border-(--insis-success) hover:bg-(--insis-success-light)'
				]"
				:aria-label="
					isMarkedCompleted ? $t('components.courses.CourseRowExpanded.markedCompleted') : $t('components.courses.CourseRowExpanded.markAsCompleted')
				"
				@click="handleToggleCompleted"
			>
				<IconCircleCheck :class="['h-4 w-4', isMarkedCompleted ? 'text-(--insis-success)' : 'text-(--insis-gray-400)']" aria-hidden="true" />
				{{
					isMarkedCompleted ? $t('components.courses.CourseRowExpanded.markedCompleted') : $t('components.courses.CourseRowExpanded.markAsCompleted')
				}}
			</button>
		</div>

		<!-- Secondary context: faculty + category -->
		<dl class="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
			<dt class="text-(--insis-gray-500)">{{ $t('components.courses.CourseRowExpanded.faculty') }}</dt>
			<dd>{{ course.faculty_id ? getFacultyLabel(course.faculty_id) : '-' }}</dd>

			<template v-if="course.study_plans?.length">
				<dt class="text-(--insis-gray-500)">{{ $t('components.courses.CourseRowExpanded.category') }}</dt>
				<dd class="flex min-w-0 flex-wrap gap-1">
					<span v-for="spc in course.study_plans" :key="spc.id" class="insis-badge" :class="getCategoryBadgeClass(spc.category || '')">
						{{ getCategoryLabel(spc.category || '') }}
					</span>
				</dd>
			</template>
		</dl>

		<!-- Assessments — grading breakdown -->
		<template v-if="course.assessments?.length">
			<p class="mb-1.5 text-xs font-medium text-(--insis-gray-500)">{{ $t('components.courses.CourseRowExpanded.assessments') }}</p>
			<ul class="mb-4 space-y-1 text-sm">
				<li v-for="assessment in sortedAssessments" :key="assessment.id" class="flex items-center gap-2">
					<span class="w-9 shrink-0 text-right font-medium text-(--insis-gray-800)">{{ assessment.weight }}%</span>
					<span class="text-(--insis-gray-600)">{{ locale === 'en' && assessment.method_en ? assessment.method_en : assessment.method }}</span>
				</li>
			</ul>
		</template>

		<!-- Prerequisite chips -->
		<div v-if="hasPrerequisiteChips" class="mb-4 space-y-2">
			<template v-if="course.blocked_by_course_idents?.length">
				<p class="mb-1 text-xs font-medium text-(--insis-gray-500)">{{ $t('components.courses.CourseRowExpanded.prereqBlockedBy') }}</p>
				<div class="flex flex-wrap gap-1.5">
					<button
						v-for="ident in course.blocked_by_course_idents"
						:key="ident"
						type="button"
						class="inline-flex cursor-pointer items-center rounded-full bg-(--insis-gray-100) px-2.5 py-0.5 text-xs text-(--insis-gray-700) hover:bg-(--insis-blue)/10 hover:text-(--insis-blue)"
						@click="filterByIdent(ident)"
					>
						{{ ident }}
					</button>
				</div>
			</template>
			<template v-if="course.excluded_after_course_idents?.length">
				<p class="mb-1 text-xs font-medium text-(--insis-gray-500)">{{ $t('components.courses.CourseRowExpanded.prereqExcludedAfter') }}</p>
				<div class="flex flex-wrap gap-1.5">
					<button
						v-for="ident in course.excluded_after_course_idents"
						:key="ident"
						type="button"
						class="inline-flex cursor-pointer items-center rounded-full bg-(--insis-gray-100) px-2.5 py-0.5 text-xs text-(--insis-gray-700) hover:bg-(--insis-blue)/10 hover:text-(--insis-blue)"
						@click="filterByIdent(ident)"
					>
						{{ ident }}
					</button>
				</div>
			</template>
			<template v-if="course.concurrent_exclusion_idents?.length">
				<p class="mb-1 text-xs font-medium text-(--insis-gray-500)">{{ $t('components.courses.CourseRowExpanded.prereqConcurrent') }}</p>
				<div class="flex flex-wrap gap-1.5">
					<button
						v-for="ident in course.concurrent_exclusion_idents"
						:key="ident"
						type="button"
						class="inline-flex cursor-pointer items-center rounded-full bg-(--insis-gray-100) px-2.5 py-0.5 text-xs text-(--insis-gray-700) hover:bg-(--insis-blue)/10 hover:text-(--insis-blue)"
						@click="filterByIdent(ident)"
					>
						{{ ident }}
					</button>
				</div>
			</template>
			<template v-if="course.recommended_before_course_idents?.length">
				<p class="mb-1 text-xs font-medium text-(--insis-gray-500)">{{ $t('components.courses.CourseRowExpanded.prereqRecommendedBefore') }}</p>
				<div class="flex flex-wrap gap-1.5">
					<button
						v-for="ident in course.recommended_before_course_idents"
						:key="ident"
						type="button"
						class="inline-flex cursor-pointer items-center rounded-full bg-(--insis-gray-100) px-2.5 py-0.5 text-xs text-(--insis-gray-700) hover:bg-(--insis-blue)/10 hover:text-(--insis-blue)"
						@click="filterByIdent(ident)"
					>
						{{ ident }}
					</button>
				</div>
			</template>
		</div>

		<!-- Syllabus sections -->
		<details v-if="syllabusFields.length" class="mb-4 border-t border-(--insis-border-light) pt-3">
			<summary class="cursor-pointer text-sm font-medium text-(--insis-gray-600)">
				{{ $t('components.courses.CourseRowExpanded.syllabus') }}
			</summary>
			<div class="mt-2 space-y-3">
				<div v-for="field in syllabusFields" :key="field.key">
					<p class="mb-1 text-xs font-medium text-(--insis-gray-500)">{{ field.label }}</p>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<div class="prose prose-sm max-w-none text-(--insis-gray-700)" v-html="marked.parse(field.value)" />
				</div>
			</div>
		</details>

		<!-- Footer: data freshness + refresh -->
		<div class="flex items-center justify-between border-t border-(--insis-border-light) pt-3">
			<span class="flex items-center gap-1 text-xs" :class="isCourseStale(course.updated_at) ? 'text-(--insis-warning)' : 'text-(--insis-text-3)'">
				<IconClock class="h-3 w-3" aria-hidden="true" />
				{{ $t('components.courses.CourseRowExpanded.lastFetched', { age: formattedAge }) }}
			</span>
			<CourseRefreshButton :course-id="course.id" />
		</div>
	</div>
</template>
