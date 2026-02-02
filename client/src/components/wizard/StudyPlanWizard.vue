<script setup lang="ts">
import WizardStepCompletedCourses from '@client/components/wizard/WizardStepCompletedCourses.vue'
import WizardStepFaculty from '@client/components/wizard/WizardStepFaculty.vue'
import WizardStepStudyPlan from '@client/components/wizard/WizardStepStudyPlan.vue'
import WizardStepYear from '@client/components/wizard/WizardStepYear.vue'
import WizardSteps from '@client/components/wizard/WizardSteps.vue'
import { useWizardStore } from '@client/stores'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

/*
 * StudyPlanWizard
 * Main wizard component for guiding users through study plan selection.
 * Supports selecting multiple study plans (base plan + specializations).
 * Steps: 1. Faculty → 2. Year → 3. Study Plans (multi-select) → 4. Completed Courses
 */

const router = useRouter()
const wizardStore = useWizardStore()

// Load initial facet data
onMounted(async () => {
	if (wizardStore.facultyFacets.length === 0) {
		await wizardStore.loadInitialFacets()
	}
})

/** Selected plans for the WizardStepStudyPlan component */
const selectedPlans = computed(() => wizardStore.selectedStudyPlans)

function handleComplete() {
	if (wizardStore.completeWizard()) {
		router.push('/courses')
	}
}

function handleSkipCompletedCourses() {
	// Complete wizard without selecting completed courses
	if (wizardStore.completeWizard()) {
		router.push('/courses')
	}
}

function handleReset() {
	wizardStore.reset()
}

/** Handle proceeding from step 3 to step 4 */
function handleProceedToStep4() {
	wizardStore.proceedToCompletedCourses()
}

/** Handle toggling a study plan selection */
function handleToggleStudyPlan(id: number, ident: string, title: string) {
	wizardStore.toggleStudyPlan(id, ident, title)
}

/** Handle selecting a single study plan (for quick proceed) */
function handleSelectStudyPlan(id: number, ident: string, title: string) {
	wizardStore.selectStudyPlan(id, ident, title)
}
</script>

<template>
	<div class="mx-auto max-w-4xl p-6">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-2xl font-bold text-[var(--insis-gray-900)]">{{ $t('components.wizard.StudyPlanWizard.title') }}</h1>
			<p class="text-[var(--insis-gray-600)]">{{ $t('components.wizard.StudyPlanWizard.description') }}</p>
		</div>

		<!-- Progress Steps -->
		<WizardSteps
			:current-step="wizardStore.currentStep"
			:step1-complete="wizardStore.step1Complete"
			:step2-complete="wizardStore.step2Complete"
			:step3-complete="wizardStore.step3Complete"
			:step4-complete="wizardStore.step4Complete"
			@go-to-step="wizardStore.goToStep"
		/>

		<!-- Error State -->
		<div v-if="wizardStore.error" class="insis-panel insis-panel-danger mb-6">
			<p>{{ wizardStore.error }}</p>
		</div>

		<!-- Loading State -->
		<div v-if="wizardStore.loading" class="insis-loading">
			<div class="insis-spinner" />
		</div>

		<!-- Step Content -->
		<div v-else class="min-h-[400px]">
			<!-- Step 1: Faculty Selection -->
			<WizardStepFaculty
				v-if="wizardStore.currentStep === 1"
				:faculties="wizardStore.facultyFacets"
				:selected-faculty="wizardStore.facultyId"
				@select="wizardStore.selectFaculty"
			/>

			<!-- Step 2: Year Selection -->
			<WizardStepYear
				v-else-if="wizardStore.currentStep === 2"
				:years="wizardStore.yearFacets"
				:selected-year="wizardStore.year"
				@select="wizardStore.selectYear"
				@back="wizardStore.goToStep(1)"
			/>

			<!-- Step 3: Study Plan Selection (Multi-select) -->
			<WizardStepStudyPlan
				v-else-if="wizardStore.currentStep === 3"
				:study-plans="wizardStore.filteredStudyPlans"
				:level-facets="wizardStore.levelFacets"
				:selected-plans="selectedPlans"
				:level-filter="wizardStore.levelFilter"
				:title-search="wizardStore.titleSearch"
				@toggle="handleToggleStudyPlan"
				@select="handleSelectStudyPlan"
				@set-level-filter="wizardStore.setLevelFilter"
				@set-title-search="wizardStore.setTitleSearch"
				@back="wizardStore.goToStep(2)"
				@complete="handleProceedToStep4"
			/>

			<!-- Step 4: Completed Courses -->
			<WizardStepCompletedCourses
				v-else-if="wizardStore.currentStep === 4"
				:courses-by-category="wizardStore.studyPlanCoursesByCategory"
				:available-categories="wizardStore.availableCourseCategories"
				:completed-course-idents="wizardStore.completedCourseIdents"
				:category-filter="wizardStore.completedCoursesCategoryFilter"
				:search-query="wizardStore.completedCoursesSearch"
				:loading="wizardStore.studyPlanCoursesLoading"
				:total-course-count="wizardStore.studyPlanCourses.length"
				@toggle="wizardStore.toggleCompletedCourse"
				@set-category-filter="wizardStore.setCompletedCoursesCategoryFilter"
				@set-search="wizardStore.setCompletedCoursesSearch"
				@back="wizardStore.goToStep(3)"
				@complete="handleComplete"
				@skip="handleSkipCompletedCourses"
			/>
		</div>

		<!-- Selection Summary & Actions -->
		<div v-if="wizardStore.selectionSummary" class="mt-6 border-t border-[var(--insis-border)] pt-4">
			<div class="flex items-center justify-between">
				<div>
					<span class="text-sm text-[var(--insis-gray-600)]"> {{ $t('components.wizard.StudyPlanWizard.currentSelection') }} </span>
					<span class="ml-2 text-sm font-medium">
						{{ wizardStore.selectionSummary }}
					</span>
					<span v-if="wizardStore.completedCourseCount > 0" class="ml-2 text-xs text-[var(--insis-gray-500)]">
						({{ $t('components.wizard.WizardStepCompletedCourses.completedCount', { count: wizardStore.completedCourseCount }) }})
					</span>
				</div>
				<button type="button" class="insis-btn-text text-sm" @click="handleReset">{{ $t('components.wizard.StudyPlanWizard.startOver') }}</button>
			</div>
		</div>
	</div>
</template>
