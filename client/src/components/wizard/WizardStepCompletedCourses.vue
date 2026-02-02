<script setup lang="ts">
import type { Course } from '@api/Database/types'
import { useCourseLabels } from '@client/composables'
import { computed, ref } from 'vue'
import IconCheck from '~icons/lucide/check'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconInfo from '~icons/lucide/info'
import IconSearch from '~icons/lucide/search'
import IconSkipForward from '~icons/lucide/skip-forward'
import IconSquare from '~icons/lucide/square'
import IconSquareCheck from '~icons/lucide/square-check-big'

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
	coursesByCategory: Map<string, Course[]>
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
function completedInCategory(courses: Course[]): number {
	return courses.filter((c) => isCompleted(c.ident)).length
}

/** Total completed count */
const totalCompleted = computed(() => props.completedCourseIdents.length)

/** Sorted categories — ordered by priority */
const sortedEntries = computed(() => {
	const priority = ['compulsory', 'elective', 'language', 'state_exam', 'physical_education', 'beyond_scope']
	return [...props.coursesByCategory.entries()].sort(([a], [b]) => {
		const ai = priority.indexOf(a)
		const bi = priority.indexOf(b)
		return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
	})
})

function handleSearchInput(event: Event) {
	emit('setSearch', (event.target as HTMLInputElement).value)
}
</script>

<template>
	<div>
		<h2 class="mb-2 text-lg font-medium text-[var(--insis-gray-900)]">
			{{ $t('components.wizard.WizardStepCompletedCourses.title') }}
		</h2>

		<p class="mb-4 text-sm text-[var(--insis-gray-600)]">
			{{ $t('components.wizard.WizardStepCompletedCourses.description') }}
		</p>

		<!-- Info panel -->
		<div class="mb-4 flex items-start gap-2 rounded border border-[var(--insis-blue)] bg-[var(--insis-blue-light)] p-3 text-sm">
			<IconInfo class="mt-0.5 h-4 w-4 shrink-0 text-[var(--insis-blue)]" />
			<p class="text-[var(--insis-gray-700)]">
				{{ $t('components.wizard.WizardStepCompletedCourses.infoText') }}
			</p>
		</div>

		<!-- Search & Category filter bar -->
		<div class="mb-4 space-y-3">
			<!-- Search -->
			<div class="relative">
				<IconSearch class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--insis-gray-500)]" />
				<input
					type="text"
					class="insis-input pl-9"
					:placeholder="$t('components.wizard.WizardStepCompletedCourses.searchPlaceholder')"
					:value="searchQuery"
					@input="handleSearchInput"
				/>
			</div>

			<!-- Category filter chips -->
			<div v-if="availableCategories.length > 1" class="flex flex-wrap gap-2">
				<button
					v-for="category in availableCategories"
					:key="category"
					type="button"
					:class="[
						'rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer',
						isCategoryFilterActive(category)
							? 'border-[var(--insis-blue)] bg-[var(--insis-blue-light)] text-[var(--insis-blue)]'
							: 'border-[var(--insis-border)] bg-white text-[var(--insis-gray-600)] hover:border-[var(--insis-blue)]',
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
		<div v-else-if="sortedEntries.length > 0" class="space-y-4">
			<div v-for="[category, courses] in sortedEntries" :key="category" class="rounded border border-[var(--insis-border)] bg-white">
				<!-- Category header -->
				<button
					type="button"
					class="flex w-full cursor-pointer items-center justify-between p-3 text-left hover:bg-[var(--insis-gray-50)]"
					@click="toggleCategory(category)"
				>
					<div class="flex items-center gap-2">
						<IconChevronDown
							:class="['h-4 w-4 text-[var(--insis-gray-500)] transition-transform', { '-rotate-90': collapsedCategories.has(category) }]"
						/>
						<span class="insis-badge" :class="getCategoryBadgeClass(category)">
							{{ getCategoryLabel(category) }}
						</span>
						<span class="text-sm text-[var(--insis-gray-500)]"> ({{ courses.length }}) </span>
					</div>
					<span v-if="completedInCategory(courses) > 0" class="text-xs text-[var(--insis-success)]">
						<IconCheck class="mr-1 inline h-3 w-3" />
						{{ completedInCategory(courses) }} {{ $t('components.wizard.WizardStepCompletedCourses.marked') }}
					</span>
				</button>

				<!-- Course list -->
				<div v-show="!collapsedCategories.has(category)" class="border-t border-[var(--insis-border)]">
					<label
						v-for="course in courses"
						:key="course.id"
						:class="[
							'flex cursor-pointer items-center gap-3 border-b border-[var(--insis-border-light)] px-3 py-2 last:border-b-0 transition-colors',
							isCompleted(course.ident) ? 'bg-green-50' : 'hover:bg-[var(--insis-gray-50)]',
						]"
					>
						<input type="checkbox" class="sr-only" :checked="isCompleted(course.ident)" @change="emit('toggle', course.ident)" />
						<component
							:is="isCompleted(course.ident) ? IconSquareCheck : IconSquare"
							:class="['h-5 w-5 shrink-0', isCompleted(course.ident) ? 'text-[var(--insis-success)]' : 'text-[var(--insis-gray-400)]']"
						/>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-[var(--insis-gray-700)]">{{ course.ident }}</span>
								<span class="truncate text-sm text-[var(--insis-gray-600)]">{{ getCourseTitle(course) }}</span>
							</div>
							<div class="flex items-center gap-3 text-xs text-[var(--insis-gray-500)]">
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
			<p class="text-[var(--insis-gray-500)]">
				{{ $t('components.wizard.WizardStepCompletedCourses.noCoursesFound') }}
			</p>
		</div>

		<!-- Summary & Actions -->
		<div class="mt-6 flex items-center justify-between border-t border-[var(--insis-border)] pt-4">
			<div class="flex items-center gap-4">
				<button type="button" class="insis-btn-text text-sm" @click="emit('back')">← {{ $t('common.back') }}</button>
				<span v-if="totalCompleted > 0" class="text-sm text-[var(--insis-gray-600)]">
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
