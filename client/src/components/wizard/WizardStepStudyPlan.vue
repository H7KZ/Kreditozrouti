<script setup lang="ts">
import type { FacetItem } from '@shared/http/facets'
import type { StudyPlanWithRelationsDTO } from '@shared/http/responses'
import { computed, ref } from 'vue'
import { useCourseLabels, useDebouncedFn } from '@client/composables'
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

/** Represents a selected study plan */
interface SelectedStudyPlan {
	id: number
	ident: string | null
	title: string | null
}

interface Props {
	studyPlans: StudyPlanWithRelationsDTO[]
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
function handleTogglePlan(plan: StudyPlanWithRelationsDTO) {
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
			<h2 class="text-lg font-medium text-(--insis-gray-900)">{{ $t('components.wizard.WizardStepStudyPlan.title') }}</h2>
		</div>

		<p class="mb-4 text-sm text-(--insis-gray-600)">{{ $t('components.wizard.WizardStepStudyPlan.description') }}</p>

		<!-- Specialization Info Banner -->
		<div v-if="showSpecializationInfo" class="mb-4 flex items-start gap-3 rounded border border-(--insis-blue) bg-(--insis-blue-light) p-3">
			<IconInfo class="mt-0.5 h-5 w-5 shrink-0 text-(--insis-blue)" />
			<div class="flex-1">
				<p class="text-sm font-medium text-(--insis-blue-dark)">
					{{ $t('components.wizard.WizardStepStudyPlan.specializationInfoTitle') }}
				</p>
				<p class="text-sm text-(--insis-gray-700)">
					{{ $t('components.wizard.WizardStepStudyPlan.specializationInfoDescription') }}
				</p>
			</div>
			<button type="button" class="shrink-0 text-(--insis-gray-500) hover:text-(--insis-gray-700)" @click="dismissSpecializationInfo">
				<IconX class="h-4 w-4" />
			</button>
		</div>

		<!-- Filters -->
		<div class="mb-6 flex flex-wrap gap-4">
			<!-- Title Search -->
			<div class="min-w-[200px] flex-1">
				<label class="insis-label" for="title-search">{{ $t('components.wizard.WizardStepStudyPlan.searchLabel') }}</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-(--insis-gray-500)" />
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
							'cursor-pointer rounded border px-3 py-1.5 text-sm transition-all',
							levelFilter.includes(level.value as string)
								? 'border-(--insis-blue) bg-(--insis-blue) text-white'
								: 'border-(--insis-border) bg-(--insis-surface) hover:bg-(--insis-gray-50)',
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
		<div class="mb-4 flex flex-wrap items-center justify-between gap-y-2">
			<p class="text-sm text-(--insis-gray-600)">
				{{ $t('components.wizard.WizardStepStudyPlan.resultsCount', { count: studyPlans.length }) }}
			</p>
			<div class="flex items-center gap-3">
				<span
					class="text-sm font-medium"
					:class="{
						'text-(--insis-blue)': selectedCount > 0,
						'text-(--insis-gray-500)': selectedCount === 0,
					}"
				>
					{{ $t('components.wizard.WizardStepStudyPlan.selectedCount', { count: selectedCount }) }}
				</span>
				<button type="button" class="insis-btn insis-btn-primary w-full text-sm sm:w-auto" :disabled="!canProceed" @click="handleProceed">
					{{ $t('components.wizard.WizardStepStudyPlan.proceed') }}
				</button>
			</div>
		</div>

		<!-- Study Plans Grid -->
		<div v-if="studyPlans.length === 0" class="insis-panel insis-panel-info">
			<p>{{ $t('components.wizard.WizardStepStudyPlan.noResults') }}</p>
		</div>

		<div v-else class="grid max-h-[450px] gap-3 overflow-y-auto p-1 sm:grid-cols-2">
			<div
				v-for="plan in studyPlans"
				:key="plan.id"
				:class="[
					'cursor-pointer rounded border p-4 transition-all duration-150 active:scale-[0.99]',
					isSelected(plan.id)
						? 'border-(--insis-blue) bg-(--insis-blue-light) shadow-(--insis-shadow-sm) ring-2 ring-(--insis-blue)'
						: 'border-(--insis-border) bg-(--insis-surface) hover:border-(--insis-blue) hover:bg-(--insis-gray-50) hover:shadow-(--insis-shadow-sm)',
				]"
				@click="handleTogglePlan(plan)"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="insis-course-code text-sm">{{ plan.ident }}</span>
							<span
								v-if="plan.level"
								:class="['insis-badge text-xs', plan.level.toLowerCase().includes('bakalář') ? 'insis-badge-info' : 'insis-badge-success']"
							>
								{{ getLevelLabel(plan.level) }}
							</span>
							<span v-if="isSelected(plan.id)" class="insis-badge insis-badge-primary flex items-center gap-1 text-xs">
								<IconCheck class="h-3 w-3" />
								{{ $t('components.wizard.WizardStepStudyPlan.selected') }}
							</span>
						</div>
						<div class="mt-1.5 line-clamp-2 font-medium wrap-break-word text-(--insis-gray-900)">
							{{ plan.title }}
						</div>
						<div class="mt-1 text-sm text-(--insis-gray-500)">
							<span v-if="plan.faculty">{{ plan.faculty.title }}</span>
							<span v-if="plan.mode_of_study" class="ml-1.5">• {{ plan.mode_of_study }}</span>
						</div>
					</div>

					<!-- Selection indicator / Quick proceed -->
					<div class="flex shrink-0 flex-col items-end gap-2">
						<div
							:class="[
								'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
								isSelected(plan.id) ? 'border-(--insis-blue) bg-(--insis-blue) text-white' : 'border-(--insis-gray-300)',
							]"
						>
							<IconCheck v-if="isSelected(plan.id)" class="h-3 w-3" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Tip about double-click -->
		<p class="mt-4 text-xs text-(--insis-gray-500) italic">
			{{ $t('components.wizard.WizardStepStudyPlan.doubleClickTip') }}
		</p>
	</div>
</template>
