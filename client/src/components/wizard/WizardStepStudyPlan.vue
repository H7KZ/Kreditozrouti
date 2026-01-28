<script setup lang="ts">
import { Faculty, StudyPlan, StudyPlanCourse } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem.ts'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Search from '~icons/lucide/search'

/*
 * WizardStepStudyPlan
 * Step 3: Study plan selection - click to select and proceed (like faculty step)
 */

const { t, te } = useI18n({ useScope: 'global' })

type StudyPlanWithRelations = StudyPlan<Faculty, StudyPlanCourse>

interface Props {
	studyPlans: StudyPlanWithRelations[]
	levelFacets: FacetItem[]
	levelFilter: string[]
	titleSearch: string
}

interface Emits {
	(e: 'select', id: number, ident: string, title: string): void
	(e: 'setLevelFilter', levels: string[]): void
	(e: 'setTitleSearch', search: string): void
	(e: 'back'): void
	(e: 'complete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localTitleSearch = ref(props.titleSearch)
const localTitleTimeout = ref<number | null>(null)

function getLevelLabel(level: string): string {
	const key = `studyLevels.${level.toLowerCase()}`
	return te(key) ? t(key) : level
}

function handleTitleSearchInput(event: Event) {
	const value = (event.target as HTMLInputElement).value
	localTitleSearch.value = value

	if (localTitleTimeout.value) {
		clearTimeout(localTitleTimeout.value)
	}

	localTitleTimeout.value = window.setTimeout(() => {
		emit('setTitleSearch', value)
	}, 750)
}

function toggleLevelFilter(level: string) {
	const newLevels = props.levelFilter.includes(level) ? props.levelFilter.filter((l) => l !== level) : [...props.levelFilter, level]
	emit('setLevelFilter', newLevels)
}

/** Click on a study plan - select AND proceed immediately */
function handleSelectAndProceed(plan: StudyPlanWithRelations) {
	emit('select', plan.id, plan.ident || '', plan.title || '')
	// Immediately complete the wizard
	emit('complete')
}

function handleBack() {
	emit('back')
}
</script>

<template>
	<div>
		<div class="mb-4 flex items-center gap-4">
			<button type="button" class="insis-btn-text flex items-center gap-1" @click="handleBack">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				{{ $t('common.back') }}
			</button>
			<h2 class="text-lg font-medium text-[var(--insis-gray-900)]">{{ $t('components.wizard.WizardStepStudyPlan.title') }}</h2>
		</div>

		<p class="mb-4 text-sm text-[var(--insis-gray-600)]">{{ $t('components.wizard.WizardStepStudyPlan.description') }}</p>

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

		<!-- Results count -->
		<p class="mb-4 text-sm text-[var(--insis-gray-600)]">{{ $t('components.wizard.WizardStepStudyPlan.resultsCount', { count: studyPlans.length }) }}</p>

		<!-- Study Plans Grid (like faculty cards) -->
		<div v-if="studyPlans.length === 0" class="insis-panel insis-panel-info">
			<p>{{ $t('components.wizard.WizardStepStudyPlan.noResults') }}</p>
		</div>

		<div v-else class="grid gap-3 sm:grid-cols-2 max-h-[450px] overflow-y-auto pr-1">
			<button
				v-for="plan in studyPlans"
				:key="plan.id"
				type="button"
				class="rounded border border-[var(--insis-border)] bg-white p-4 text-left transition-all hover:border-[var(--insis-blue)] hover:bg-[var(--insis-gray-50)] cursor-pointer"
				@click="handleSelectAndProceed(plan)"
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
						</div>
						<div class="mt-1.5 font-medium text-[var(--insis-gray-900)] line-clamp-2">
							{{ plan.title }}
						</div>
						<div class="mt-1 text-sm text-[var(--insis-gray-500)]">
							<span v-if="plan.faculty">{{ plan.faculty.title }}</span>
							<span v-if="plan.mode_of_study" class="ml-1.5">• {{ plan.mode_of_study }}</span>
						</div>
					</div>
					<!-- Arrow icon -->
					<svg class="h-5 w-5 shrink-0 text-[var(--insis-gray-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</button>
		</div>
	</div>
</template>
