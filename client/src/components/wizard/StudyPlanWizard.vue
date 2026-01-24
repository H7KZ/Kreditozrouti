<script setup lang="ts">
import { StudyPlan } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem.ts'
import FacultyCard from '@client/components/wizard/FacultyCard.vue'
import LevelFilter from '@client/components/wizard/LevelFilter.vue'
import SemesterToggle from '@client/components/wizard/SemesterToggle.vue'
import StudyPlanTable from '@client/components/wizard/StudyPlanTable.vue'
import YearCard from '@client/components/wizard/YearCard.vue'
import { useFacultyName } from '@client/composables/useFacultyName.ts'
import { useStudentContext, type WizardStep } from '@client/stores/studentContext'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const studentContext = useStudentContext()
const { currentStep, isLoading, error, selectedFacultyId, selectedYear, selectedStudyPlan, availableFaculties, availableYears, studyPlans, isWizardComplete } =
	storeToRefs(studentContext)

const emit = defineEmits<{
	complete: [studyPlan: StudyPlan]
	skip: []
}>()

// Study plan filters
const studyPlanSearch = ref('')
const studyPlanLevelFilter = ref<'all' | 'bachelor' | 'master' | 'doctoral'>('all')

// Semester selection
const selectedSemester = ref<'ZS' | 'LS'>('ZS')

onMounted(() => {
	studentContext.initialize()
})

// Calculate current academic year
const currentAcademicYear = computed(() => {
	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed

	// Academic year starts in September (month 9)
	// If we're in Jan-Aug, the academic year started last year
	// If we're in Sep-Dec, the academic year started this year
	return currentMonth >= 9 ? currentYear : currentYear - 1
})

// Wizard step definitions
const steps = computed<{ id: WizardStep; label: string }[]>(() => [
	{ id: 'faculty', label: t('wizard.steps.faculty') },
	{ id: 'year', label: t('wizard.steps.year') },
	{ id: 'studyPlan', label: t('wizard.steps.studyPlan') },
])

const currentStepIndex = computed(() => {
	if (currentStep.value === 'complete') return steps.value.length
	return steps.value.findIndex((s) => s.id === currentStep.value)
})

function getStepStatus(stepIndex: number): 'completed' | 'active' | 'pending' {
	if (stepIndex < currentStepIndex.value) return 'completed'
	if (stepIndex === currentStepIndex.value) return 'active'
	return 'pending'
}

function handleFacultySelect(faculty: FacetItem) {
	studentContext.selectFaculty(faculty.value as string)
}

function handleYearSelect(year: number) {
	// Auto-select winter semester (ZS) when year is chosen
	selectedSemester.value = 'ZS'
	studentContext.selectYear(year)
}

function handleStudyPlanSelect(plan: StudyPlan) {
	studentContext.selectStudyPlan(plan)
	emit('complete', plan)
}

function goBack(step: WizardStep) {
	studentContext.goToStep(step)
	// Reset filters when going back
	if (step === 'year') {
		studyPlanSearch.value = ''
		studyPlanLevelFilter.value = 'all'
	}
	if (step === 'faculty') {
		selectedSemester.value = 'ZS'
	}
}

function handleSkip() {
	studentContext.skipWizard()
	emit('skip')
}

// Get localized faculty name
function getLocalizedFacultyName(facultyId: string): string {
	return useFacultyName().getFacultyName(facultyId)
}

// Filtered study plans
const filteredStudyPlans = computed(() => {
	let filtered = studyPlans.value

	// Text search
	if (studyPlanSearch.value.trim()) {
		const searchLower = studyPlanSearch.value.toLowerCase()
		filtered = filtered.filter((plan) => plan.title!.toLowerCase().includes(searchLower) || plan.ident!.toLowerCase().includes(searchLower))
	}

	// Level filter
	if (studyPlanLevelFilter.value !== 'all') {
		filtered = filtered.filter((plan) => {
			if (!plan.level) return false
			const planLevel = plan.level.toLowerCase()

			if (studyPlanLevelFilter.value === 'bachelor') {
				return planLevel.includes('bakalář') || planLevel.includes('bachelor') || planLevel.includes('bc')
			}
			if (studyPlanLevelFilter.value === 'master') {
				return planLevel.includes('magistr') || planLevel.includes('master') || planLevel.includes('mgr')
			}
			if (studyPlanLevelFilter.value === 'doctoral') {
				return planLevel.includes('doktor') || planLevel.includes('doctoral') || planLevel.includes('ph.d')
			}
			return true
		})
	}

	return filtered
})
</script>

<template>
	<div class="insis-panel">
		<!-- Header with Skip Option -->
		<div class="flex items-center justify-between mb-4 pb-3 border-b border-[var(--insis-border)]">
			<h2 class="text-lg font-bold text-[var(--insis-gray-900)]">{{ t('wizard.title') }}</h2>
			<button class="text-sm text-[var(--insis-link)] hover:underline cursor-pointer" @click="handleSkip">
				{{ t('wizard.skip') }}
			</button>
		</div>

		<!-- Wizard Steps Header -->
		<div class="insis-wizard">
			<template v-for="(step, index) in steps" :key="step.id">
				<div
					class="insis-wizard-step"
					:class="{
						active: getStepStatus(index) === 'active',
						completed: getStepStatus(index) === 'completed',
					}"
				>
					<div class="insis-wizard-step-number">
						<template v-if="getStepStatus(index) === 'completed'">✓</template>
						<template v-else>{{ index + 1 }}</template>
					</div>
					<span class="insis-wizard-step-label">{{ step.label }}</span>
				</div>
				<div v-if="index < steps.length - 1" class="insis-wizard-connector" :class="{ completed: getStepStatus(index) === 'completed' }"></div>
			</template>
		</div>

		<!-- Error Message -->
		<div v-if="error" class="insis-panel-danger mb-4">
			{{ error }}
			<button class="insis-btn insis-btn-sm ml-2 cursor-pointer" @click="studentContext.initialize()">{{ t('errors.tryAgain') }}</button>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="insis-loading">
			<div class="insis-spinner"></div>
			<span class="ml-2">{{ t('common.loading') }}</span>
		</div>

		<!-- Step 1: Faculty Selection -->
		<div v-else-if="currentStep === 'faculty'">
			<h3 class="insis-panel-title">{{ t('wizard.faculty.title') }}</h3>
			<p class="text-sm text-[var(--insis-gray-600)] mb-4">{{ t('wizard.faculty.description') }}</p>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<FacultyCard
					v-for="faculty in availableFaculties"
					:key="String(faculty.value)"
					:faculty="faculty"
					:selected="selectedFacultyId === faculty.value"
					@select="handleFacultySelect"
				/>
			</div>
		</div>

		<!-- Step 2: Year Selection -->
		<div v-else-if="currentStep === 'year'">
			<div class="flex items-center gap-2 mb-4">
				<button class="insis-btn insis-btn-sm cursor-pointer" @click="goBack('faculty')">{{ t('wizard.year.back') }}</button>
				<h3 class="insis-panel-title mb-0">{{ t('wizard.year.title') }}</h3>
			</div>
			<p class="text-sm text-[var(--insis-gray-600)] mb-4">
				{{ t('wizard.year.description', { faculty: getLocalizedFacultyName(String(selectedFacultyId)) }) }}
			</p>

			<!-- Year Grid -->
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
				<YearCard
					v-for="year in availableYears"
					:key="String(year.value)"
					:year="Number(year.value)"
					:count="year.count"
					:selected="selectedYear === year.value"
					:is-current="Number(year.value) === currentAcademicYear"
					@select="handleYearSelect"
				/>
			</div>

			<!-- Semester Toggle -->
			<div v-if="selectedYear" class="mb-6">
				<SemesterToggle v-model="selectedSemester" />
			</div>

			<!-- Selection Summary -->
			<div v-if="selectedYear" class="bg-[#f0f7ff] border border-[#4a7eb8] rounded-lg p-4">
				<div class="text-sm text-[#1e4a7a]">
					<span class="font-medium">{{ t('wizard.year.selected') }}:</span>
					{{ selectedYear }}/{{ Number(selectedYear) + 1 }}
					·
					{{ selectedSemester === 'ZS' ? t('wizard.year.winter') : t('wizard.year.summer') }}
				</div>
			</div>
		</div>

		<!-- Step 3: Study Plan Selection -->
		<div v-else-if="currentStep === 'studyPlan'">
			<div class="flex items-center gap-2 mb-4">
				<button class="insis-btn insis-btn-sm cursor-pointer" @click="goBack('year')">{{ t('wizard.studyPlan.back') }}</button>
				<h3 class="insis-panel-title mb-0">{{ t('wizard.studyPlan.title') }}</h3>
			</div>
			<p class="text-sm text-[var(--insis-gray-600)] mb-4">
				{{
					t('wizard.studyPlan.description', {
						faculty: getLocalizedFacultyName(String(selectedFacultyId)),
						year: selectedYear,
						nextYear: Number(selectedYear) + 1,
					})
				}}
			</p>

			<!-- Search and Filters -->
			<div class="mb-6 space-y-4 bg-white p-4 rounded-lg border border-[var(--insis-border)]">
				<div>
					<label class="block text-sm font-medium text-[#374151] mb-2">{{ t('wizard.studyPlan.search') }}</label>
					<div class="relative">
						<input v-model="studyPlanSearch" type="text" class="insis-input w-full pl-10" :placeholder="t('wizard.studyPlan.searchPlaceholder')" />
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>

				<LevelFilter v-model="studyPlanLevelFilter" />

				<div class="text-sm text-[#6b7280]">
					{{ t('wizard.studyPlan.resultsCount', { count: filteredStudyPlans.length, total: studyPlans.length }) }}
				</div>
			</div>

			<!-- Study Plan Table -->
			<StudyPlanTable :plans="filteredStudyPlans" :loading="isLoading" :selected-id="selectedStudyPlan?.id" @select="handleStudyPlanSelect" />
		</div>

		<!-- Complete State -->
		<div v-else-if="isWizardComplete && selectedStudyPlan">
			<div class="flex items-center justify-between mb-4">
				<h3 class="insis-panel-title mb-0">{{ t('wizard.complete.title') }}</h3>
				<button class="insis-btn insis-btn-sm cursor-pointer" @click="studentContext.reset()">{{ t('wizard.complete.change') }}</button>
			</div>

			<div class="insis-panel-success">
				<div class="font-bold">{{ selectedStudyPlan.title }}</div>
				<div class="text-sm">
					<span class="insis-course-code">{{ selectedStudyPlan.ident }}</span>
					·
					{{ getLocalizedFacultyName(selectedStudyPlan.faculty_id ?? '') }}
					·
					{{ selectedYear }}/{{ Number(selectedYear) + 1 }}
				</div>
			</div>
		</div>
	</div>
</template>
