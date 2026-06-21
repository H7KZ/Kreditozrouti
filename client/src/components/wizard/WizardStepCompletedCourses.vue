<script setup lang="ts">
import type { CourseDTO } from '@shared/http/responses'
import { computed, ref } from 'vue'
import { useCourseLabels, useDebouncedFn } from '@client/composables'
import IconCheck from '~icons/lucide/check'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconInfo from '~icons/lucide/info'
import IconSearch from '~icons/lucide/search'
import IconSkipForward from '~icons/lucide/skip-forward'
import IconSquare from '~icons/lucide/square'
import IconSquareCheck from '~icons/lucide/square-check-big'
import IconX from '~icons/lucide/x'

/**
 * WizardStepCompletedCourses
 * Step 4: Mark courses as already completed.
 * Shows courses from selected study plans grouped by category.
 * Category grouping is derived by the store via cross-referencing study plan pivot data.
 * This is optional — students can skip this step.
 */

const { getCourseTitle, getCategoryLabel, getCategoryBadgeClass, getCompletionLabel } = useCourseLabels()

interface Props {
	/** Courses grouped by category (derived from study plan cross-reference) */
	coursesByCategory: Map<string, CourseDTO[]>
	availableCategories: string[]
	completedCourseIdents: string[]
	categoryFilter: string[]
	searchQuery: string
	loading: boolean
	totalCourseCount: number
}

interface Emits {
	(e: 'toggle', courseIdent: string): void
	(e: 'setCategoryFilter', categories: string[]): void
	(e: 'setSearch', search: string): void
	(e: 'back'): void
	(e: 'complete'): void
	(e: 'skip'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** Which category sections are collapsed */
const collapsedCategories = ref<Set<string>>(new Set())

const localSearch = ref(props.searchQuery)

const debouncedSetSearch = useDebouncedFn((value: string) => {
	emit('setSearch', value)
}, 750)

/** Whether a course is marked as completed */
function isCompleted(courseIdent: string): boolean {
	return props.completedCourseIdents.includes(courseIdent)
}

/** Toggle category collapse */
function toggleCategory(category: string) {
	if (collapsedCategories.value.has(category)) {
		collapsedCategories.value.delete(category)
	} else {
		collapsedCategories.value.add(category)
	}
}

/** Toggle category filter chip */
function toggleCategoryFilter(category: string) {
	const current = [...props.categoryFilter]
	const index = current.indexOf(category)
	if (index !== -1) {
		current.splice(index, 1)
	} else {
		current.push(category)
	}
	emit('setCategoryFilter', current)
}

/** Whether a category filter is active */
function isCategoryFilterActive(category: string): boolean {
	return props.categoryFilter.includes(category)
}

/** Completed count in a category */
function completedInCategory(courses: CourseDTO[]): number {
	return courses.filter(c => isCompleted(c.ident)).length
}

/** Total completed count */
const totalCompleted = computed(() => props.completedCourseIdents.length)

/** Sorted categories — ordered by priority */
const sortedEntries = computed(() => {
	const priority = ['compulsory', 'elective_faculty', 'elective_university', 'elective', 'language', 'state_exam', 'physical_education', 'beyond_scope']
	return [...props.coursesByCategory.entries()].sort(([a], [b]) => {
		const ai = priority.indexOf(a)
		const bi = priority.indexOf(b)
		return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
	})
})

function handleSearchInput(event: Event) {
	const value = (event.target as HTMLInputElement).value
	localSearch.value = value
	debouncedSetSearch(value)
}

function clearSearch() {
	localSearch.value = ''
	emit('setSearch', '')
}
</script>

<template>
	<div>
		<h2 class="mb-2 text-lg font-medium text-(--insis-gray-900)">
			{{ $t('components.wizard.WizardStepCompletedCourses.title') }}
		</h2>

		<p class="mb-4 text-sm text-(--insis-gray-600)">
			{{ $t('components.wizard.WizardStepCompletedCourses.description') }}
		</p>

		<!-- Info panel -->
		<div class="mb-4 flex items-start gap-2 rounded border border-(--insis-blue) bg-(--insis-blue-light) p-3 text-sm">
			<IconInfo class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" />
			<p class="text-(--insis-gray-700)">
				{{ $t('components.wizard.WizardStepCompletedCourses.infoText') }}
			</p>
		</div>

		<!-- Search & Category filter bar -->
		<div class="mb-4 space-y-3">
			<!-- Search -->
			<div class="relative">
				<IconSearch class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-(--insis-gray-500)" />
				<input
					type="text"
					class="insis-input pr-8 pl-9"
					:placeholder="$t('components.wizard.WizardStepCompletedCourses.searchPlaceholder')"
					:value="localSearch"
					@input="handleSearchInput"
				/>
				<button
					v-if="localSearch"
					type="button"
					class="absolute top-1/2 right-2.5 -translate-y-1/2 text-(--insis-gray-400) hover:text-(--insis-gray-600)"
					:aria-label="$t('common.clear')"
					@click="clearSearch"
				>
					<IconX class="h-4 w-4" />
				</button>
			</div>

			<!-- Category filter chips -->
			<div v-if="availableCategories.length > 1" class="flex flex-wrap gap-2">
				<button
					v-for="category in availableCategories"
					:key="category"
					type="button"
					:class="[
						'cursor-pointer rounded-full border px-3 py-2.5 text-xs transition-all duration-150 active:scale-[0.97]',
						isCategoryFilterActive(category)
							? 'border-(--insis-blue) bg-(--insis-blue-light) text-(--insis-blue)'
							: 'border-(--insis-border) bg-(--insis-surface) text-(--insis-gray-600) hover:border-(--insis-blue) hover:bg-(--insis-blue-subtle)'
					]"
					@click="toggleCategoryFilter(category)"
				>
					{{ getCategoryLabel(category) }}
				</button>
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="flex items-center justify-center py-12">
			<div class="insis-spinner" />
		</div>

		<!-- Course list grouped by category -->
		<div v-else-if="sortedEntries.length > 0" class="max-h-[450px] space-y-4 overflow-y-auto pr-1">
			<div v-for="[category, courses] in sortedEntries" :key="category" class="rounded border border-(--insis-border) bg-(--insis-surface)">
				<!-- Category header -->
				<button
					type="button"
					class="flex w-full cursor-pointer items-center justify-between p-3 text-left hover:bg-(--insis-gray-50)"
					@click="toggleCategory(category)"
				>
					<div class="flex items-center gap-2">
						<IconChevronDown
							:class="['h-4 w-4 text-(--insis-gray-500) transition-transform', { '-rotate-90': collapsedCategories.has(category) }]"
						/>
						<span class="insis-badge" :class="getCategoryBadgeClass(category)">
							{{ getCategoryLabel(category) }}
						</span>
						<span class="text-sm text-(--insis-gray-500)"> ({{ courses.length }}) </span>
					</div>
					<span v-if="completedInCategory(courses) > 0" class="text-xs text-(--insis-success)">
						<IconCheck class="mr-1 inline h-3 w-3" />
						{{ completedInCategory(courses) }} {{ $t('components.wizard.WizardStepCompletedCourses.marked') }}
					</span>
				</button>

				<!-- Course list -->
				<div v-show="!collapsedCategories.has(category)" class="border-t border-(--insis-border)">
					<label
						v-for="course in courses"
						:key="course.id"
						:class="[
							'relative flex min-h-[44px] cursor-pointer items-center gap-3 border-b border-(--insis-border-light) px-3 py-2 transition-colors last:border-b-0',
							isCompleted(course.ident) ? 'bg-(--insis-success-light)' : 'hover:bg-(--insis-gray-50)'
						]"
					>
						<input type="checkbox" class="sr-only" :checked="isCompleted(course.ident)" @change="emit('toggle', course.ident)" />
						<component
							:is="isCompleted(course.ident) ? IconSquareCheck : IconSquare"
							:class="['h-5 w-5 shrink-0', isCompleted(course.ident) ? 'text-(--insis-success)' : 'text-(--insis-gray-400)']"
						/>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-(--insis-gray-700)">{{ course.ident }}</span>
								<span class="truncate text-sm text-(--insis-gray-600)">{{ getCourseTitle(course) }}</span>
							</div>
							<div class="flex items-center gap-3 text-xs text-(--insis-gray-500)">
								<span v-if="course.ects">{{ course.ects }} ECTS</span>
								<span v-if="course.mode_of_completion">{{ getCompletionLabel(course.mode_of_completion) }}</span>
							</div>
						</div>
					</label>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<div v-else class="py-12 text-center">
			<p class="text-(--insis-gray-500)">
				{{ $t('components.wizard.WizardStepCompletedCourses.noCoursesFound') }}
			</p>
		</div>

		<!-- Summary & Actions -->
		<div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-(--insis-border) pt-4">
			<div class="flex items-center gap-4">
				<button type="button" class="insis-btn-text text-sm" @click="emit('back')">← {{ $t('common.back') }}</button>
				<span v-if="totalCompleted > 0" class="text-sm text-(--insis-gray-600)">
					{{ $t('components.wizard.WizardStepCompletedCourses.selectedCount', { count: totalCompleted }) }}
				</span>
			</div>
			<div class="flex items-center gap-3">
				<button type="button" class="insis-btn insis-btn-secondary flex items-center gap-1.5 text-sm" @click="emit('skip')">
					<IconSkipForward class="h-4 w-4" />
					{{ $t('components.wizard.WizardStepCompletedCourses.skip') }}
				</button>
				<button type="button" class="insis-btn insis-btn-primary text-sm" @click="emit('complete')">
					{{ $t('components.wizard.WizardStepCompletedCourses.proceed') }}
				</button>
			</div>
		</div>
	</div>
</template>
