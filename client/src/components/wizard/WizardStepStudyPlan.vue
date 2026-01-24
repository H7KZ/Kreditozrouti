<script setup lang="ts">
/**
 * WizardStepStudyPlan
 * Step 3: Study plan selection with local filtering
 */
import { computed, ref } from 'vue'

import { Faculty, StudyPlan, StudyPlanCourse } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem.ts'
import IconArrowLeft from '~icons/lucide/arrow-left'
import IconCheck from '~icons/lucide/check'
import IconSearch from '~icons/lucide/search'

type StudyPlanWithRelations = StudyPlan<Faculty, StudyPlanCourse>

interface Props {
	studyPlans: StudyPlanWithRelations[]
	levelFacets: FacetItem[]
	selectedPlanId: number | null
	levelFilter: string[]
	titleSearch: string
}

interface Emits {
	(e: 'select', id: number, ident: string | null, title: string | null): void
	(e: 'setLevelFilter', levels: string[]): void
	(e: 'setTitleSearch', search: string): void
	(e: 'back'): void
	(e: 'complete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localTitleSearch = ref(props.titleSearch)

// Level labels
const levelLabels: Record<string, string> = {
	'magisterský navazující': 'Magisterský navazující',
	doktorský: 'Doktorský',
	bakalářský: 'Bakalářský',
	'celoživotní vzdělávání': 'Celoživotní vzdělávání',
	'zahraniční studenti': 'Zahraniční studenti',
	'celoživotní vzdělávání phd': 'Celoživotní vzdělávání PhD',
}

function getLevelLabel(level: string): string {
	return levelLabels[level.toLowerCase()] || level
}

function handleTitleSearchInput(event: Event) {
	const value = (event.target as HTMLInputElement).value
	localTitleSearch.value = value
	emit('setTitleSearch', value)
}

function toggleLevelFilter(level: string) {
	const newLevels = props.levelFilter.includes(level) ? props.levelFilter.filter((l) => l !== level) : [...props.levelFilter, level]
	emit('setLevelFilter', newLevels)
}

function handleSelect(plan: StudyPlanWithRelations) {
	emit('select', plan.id, plan.ident, plan.title)
}

function handleBack() {
	emit('back')
}

function handleComplete() {
	emit('complete')
}

const isCompleteDisabled = computed(() => !props.selectedPlanId)
</script>

<template>
	<div>
		<div class="mb-4 flex items-center gap-4">
			<button type="button" class="insis-btn-text flex items-center gap-1" @click="handleBack">
				<IconArrowLeft class="h-4 w-4" />
				Zpět
			</button>
			<h2 class="text-lg font-medium text-[var(--insis-gray-900)]">Vyberte studijní plán</h2>
		</div>

		<p class="mb-4 text-sm text-[var(--insis-gray-600)]">Zvolte svůj studijní plán (obor). Můžete filtrovat podle stupně studia nebo vyhledávat v názvu.</p>

		<!-- Filters -->
		<div class="mb-6 flex flex-wrap gap-4">
			<!-- Title Search -->
			<div class="flex-1">
				<label class="insis-label" for="title-search">Vyhledat</label>
				<div class="relative">
					<IconSearch class="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--insis-gray-500)]" />
					<input
						id="title-search"
						type="text"
						class="insis-input pl-8"
						placeholder="Název nebo kód oboru..."
						:value="localTitleSearch"
						@input="handleTitleSearchInput"
					/>
				</div>
			</div>

			<!-- Level Filter -->
			<div v-if="levelFacets.length > 0">
				<label class="insis-label">Stupeň studia</label>
				<div class="flex gap-2">
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
		<p class="mb-4 text-sm text-[var(--insis-gray-600)]">Nalezeno {{ studyPlans.length }} studijních plánů</p>

		<!-- Study Plans List -->
		<div v-if="studyPlans.length === 0" class="insis-panel insis-panel-info">
			<p>Žádné studijní plány neodpovídají filtru.</p>
		</div>

		<div v-else class="max-h-[400px] space-y-2 overflow-y-auto">
			<button
				v-for="plan in studyPlans"
				:key="plan.id"
				type="button"
				:class="[
					'w-full rounded border p-3 text-left transition-all cursor-pointer',
					selectedPlanId === plan.id
						? 'border-[var(--insis-blue)] bg-[var(--insis-blue-light)]'
						: 'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue-dark)] hover:bg-[var(--insis-gray-50)]',
				]"
				@click="handleSelect(plan)"
			>
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="insis-course-code">{{ plan.ident }}</span>
							<span
								v-if="plan.level"
								:class="['insis-badge', plan.level.toLowerCase().includes('bakalář') ? 'insis-badge-info' : 'insis-badge-success']"
							>
								{{ getLevelLabel(plan.level) }}
							</span>
						</div>
						<div class="mt-1 truncate font-medium text-[var(--insis-gray-900)]">
							{{ plan.title }}
						</div>
						<div class="mt-1 text-sm text-[var(--insis-gray-500)]">
							<span v-if="plan.faculty">{{ plan.faculty.title }}</span>
							<span v-if="plan.mode_of_study" class="ml-2"> • {{ plan.mode_of_study }} </span>
						</div>
					</div>
					<div
						v-if="selectedPlanId === plan.id"
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--insis-success)] text-white"
					>
						<IconCheck class="h-4 w-4" />
					</div>
				</div>
			</button>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex justify-end gap-3 border-t border-[var(--insis-border)] pt-4">
			<button type="button" class="insis-btn" @click="handleBack">Zpět</button>
			<button type="button" class="insis-btn-primary" :disabled="isCompleteDisabled" @click="handleComplete">Pokračovat na předměty</button>
		</div>
	</div>
</template>
