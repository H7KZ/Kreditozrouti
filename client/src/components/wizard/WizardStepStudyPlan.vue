<script setup lang="ts">
import type { Faculty, StudyPlan, StudyPlanCourse } from '@api/Database/types'
import type FacetItem from '@api/Interfaces/FacetItem'
import { useCourseLabels, useDebouncedFn } from '@client/composables'
import { computed, ref } from 'vue'
import IconCheck from '~icons/lucide/check'
import IconChevronLeft from '~icons/lucide/chevron-left'
import IconInfo from '~icons/lucide/info'
import Search from '~icons/lucide/search'
import IconX from '~icons/lucide/x'

/*
 * WizardStepStudyPlan
 * Step 3: Study plan selection - supports multi-select for base plan + specializations
 * Refactored to use composables for labels and debounced search.
 */

// Composables
const { getLevelLabel } = useCourseLabels()

type StudyPlanWithRelations = StudyPlan<Faculty, StudyPlanCourse>

/** Represents a selected study plan */
interface SelectedStudyPlan {
	id: number
	ident: string | null
	title: string | null
}

interface Props {
	studyPlans: StudyPlanWithRelations[]
	levelFacets: FacetItem[]
	levelFilter: string[]
	titleSearch: string
	/** Array of selected study plans */
	selectedPlans?: SelectedStudyPlan[]
}

interface Emits {
	/** Toggle selection of a study plan */
	(e: 'toggle', id: number, ident: string, title: string): void
	/** Select single study plan (for quick selection) */
	(e: 'select', id: number, ident: string, title: string): void
	(e: 'setLevelFilter', levels: string[]): void
	(e: 'setTitleSearch', search: string): void
	(e: 'back'): void
	(e: 'complete'): void
}

const props = withDefaults(defineProps<Props>(), {
	selectedPlans: () => [],
})
const emit = defineEmits<Emits>()

const localTitleSearch = ref(props.titleSearch)

// Debounced search using composable
const debouncedSetTitleSearch = useDebouncedFn((value: string) => {
	emit('setTitleSearch', value)
}, 750)

/** Whether to show the specialization info banner */
const showSpecializationInfo = ref(true)

/** Check if a study plan is selected */
function isSelected(planId: number): boolean {
	return props.selectedPlans.some((p) => p.id === planId)
}

/** Number of selected plans */
const selectedCount = computed(() => props.selectedPlans.length)

/** Whether user can proceed (at least one plan selected) */
const canProceed = computed(() => selectedCount.value > 0)

function handleTitleSearchInput(event: Event) {
	const value = (event.target as HTMLInputElement).value
	localTitleSearch.value = value
	debouncedSetTitleSearch(value)
}

function toggleLevelFilter(level: string) {
	const newLevels = props.levelFilter.includes(level) ? props.levelFilter.filter((l) => l !== level) : [...props.levelFilter, level]
	emit('setLevelFilter', newLevels)
}

/** Toggle selection of a study plan */
function handleTogglePlan(plan: StudyPlanWithRelations) {
	emit('toggle', plan.id, plan.ident || '', plan.title || '')
}

/** Proceed with current selection */
function handleProceed() {
	if (canProceed.value) {
		emit('complete')
	}
}

function handleBack() {
	emit('back')
}

function dismissSpecializationInfo() {
	showSpecializationInfo.value = false
}
</script>

<template>
	<div>
		<div class="mb-4 flex items-center gap-4">
			<button type="button" class="insis-btn-text flex items-center gap-1" @click="handleBack">
				<IconChevronLeft class="h-4 w-4" />
				{{ $t('common.back') }}
			</button>
			<h2 class="text-lg font-medium text-[var(--insis-gray-900)]">{{ $t('components.wizard.WizardStepStudyPlan.title') }}</h2>
		</div>

		<p class="mb-4 text-sm text-[var(--insis-gray-600)]">{{ $t('components.wizard.WizardStepStudyPlan.description') }}</p>

		<!-- Specialization Info Banner -->
		<div v-if="showSpecializationInfo" class="mb-4 flex items-start gap-3 rounded border border-[var(--insis-blue)] bg-[var(--insis-blue-light)] p-3">
			<IconInfo class="h-5 w-5 shrink-0 text-[var(--insis-blue)] mt-0.5" />
			<div class="flex-1">
				<p class="text-sm font-medium text-[var(--insis-blue-dark)]">
					{{ $t('components.wizard.WizardStepStudyPlan.specializationInfoTitle') }}
				</p>
				<p class="text-sm text-[var(--insis-gray-700)]">
					{{ $t('components.wizard.WizardStepStudyPlan.specializationInfoDescription') }}
				</p>
			</div>
			<button type="button" class="shrink-0 text-[var(--insis-gray-500)] hover:text-[var(--insis-gray-700)]" @click="dismissSpecializationInfo">
				<IconX class="h-4 w-4" />
			</button>
		</div>

		<!-- Filters -->
		<div class="mb-6 flex flex-wrap gap-4">
			<!-- Title Search -->
			<div class="flex-1 min-w-[200px]">
				<label class="insis-label" for="title-search">{{ $t('components.wizard.WizardStepStudyPlan.searchLabel') }}</label>
				<div class="relative">
					<Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--insis-gray-500)]" />
					<input
						id="title-search"
						type="text"
						class="insis-input pl-9"
						:placeholder="$t('components.wizard.WizardStepStudyPlan.searchPlaceholder')"
						:value="localTitleSearch"
						@input="handleTitleSearchInput"
					/>
				</div>
			</div>

			<!-- Level Filter -->
			<div v-if="levelFacets.length > 0">
				<label class="insis-label">{{ $t('components.wizard.WizardStepStudyPlan.levelLabel') }}</label>
				<div class="flex flex-wrap gap-2">
					<button
						v-for="level in levelFacets"
						:key="`level-${level.value}`"
						type="button"
						:class="[
							'rounded border px-3 py-1.5 text-sm transition-all cursor-pointer',
							levelFilter.includes(level.value as string)
								? 'border-[var(--insis-blue)] bg-[var(--insis-blue)] text-white'
								: 'border-[var(--insis-border)] bg-white hover:bg-[var(--insis-gray-50)]',
						]"
						@click="toggleLevelFilter(level.value as string)"
					>
						{{ getLevelLabel(level.value as string) }}
						<span class="ml-1 opacity-75">({{ level.count }})</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Results count and selection info -->
		<div class="mb-4 flex items-center justify-between">
			<p class="text-sm text-[var(--insis-gray-600)]">
				{{ $t('components.wizard.WizardStepStudyPlan.resultsCount', { count: studyPlans.length }) }}
			</p>
			<div class="flex items-center gap-3">
				<span
					class="text-sm font-medium"
					:class="{
						'text-[var(--insis-blue)]': selectedCount > 0,
						'text-[var(--insis-gray-500)]': selectedCount === 0,
					}"
				>
					{{ $t('components.wizard.WizardStepStudyPlan.selectedCount', { count: selectedCount }) }}
				</span>
				<button type="button" class="insis-btn insis-btn-primary text-sm" :disabled="!canProceed" @click="handleProceed">
					{{ $t('components.wizard.WizardStepStudyPlan.proceed') }}
				</button>
			</div>
		</div>

		<!-- Study Plans Grid -->
		<div v-if="studyPlans.length === 0" class="insis-panel insis-panel-info">
			<p>{{ $t('components.wizard.WizardStepStudyPlan.noResults') }}</p>
		</div>

		<div v-else class="grid gap-3 sm:grid-cols-2 max-h-[450px] overflow-y-auto p-1">
			<div
				v-for="plan in studyPlans"
				:key="plan.id"
				:class="[
					'rounded border p-4 transition-all cursor-pointer',
					isSelected(plan.id)
						? 'border-[var(--insis-blue)] bg-[var(--insis-blue-light)] ring-2 ring-[var(--insis-blue)]'
						: 'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue)] hover:bg-[var(--insis-gray-50)]',
				]"
				@click="handleTogglePlan(plan)"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="insis-course-code text-sm">{{ plan.ident }}</span>
							<span
								v-if="plan.level"
								:class="['insis-badge text-xs', plan.level.toLowerCase().includes('bakalář') ? 'insis-badge-info' : 'insis-badge-success']"
							>
								{{ getLevelLabel(plan.level) }}
							</span>
							<span v-if="isSelected(plan.id)" class="insis-badge insis-badge-primary text-xs flex items-center gap-1">
								<IconCheck class="h-3 w-3" />
								{{ $t('components.wizard.WizardStepStudyPlan.selected') }}
							</span>
						</div>
						<div class="mt-1.5 font-medium text-[var(--insis-gray-900)] line-clamp-2">
							{{ plan.title }}
						</div>
						<div class="mt-1 text-sm text-[var(--insis-gray-500)]">
							<span v-if="plan.faculty">{{ plan.faculty.title }}</span>
							<span v-if="plan.mode_of_study" class="ml-1.5">• {{ plan.mode_of_study }}</span>
						</div>
					</div>

					<!-- Selection indicator / Quick proceed -->
					<div class="shrink-0 flex flex-col items-end gap-2">
						<div
							:class="[
								'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
								isSelected(plan.id) ? 'border-[var(--insis-blue)] bg-[var(--insis-blue)] text-white' : 'border-[var(--insis-gray-300)]',
							]"
						>
							<IconCheck v-if="isSelected(plan.id)" class="h-3 w-3" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Tip about double-click -->
		<p class="mt-4 text-xs text-[var(--insis-gray-500)] italic">
			{{ $t('components.wizard.WizardStepStudyPlan.doubleClickTip') }}
		</p>
	</div>
</template>
