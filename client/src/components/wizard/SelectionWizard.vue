<script setup lang="ts">
import { Faculty } from '@api/Database/types'
import { useStudyPlansApi } from '@client/composables/useApi.ts'
import { useCoursesStore } from '@client/stores/courses.ts'
import { useSelectionStore } from '@client/stores/selection.ts'
import InSISSemester from '@scraper/Types/InSISSemester.ts'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import FacultySelector from './FacultySelector.vue'
import PeriodSelector from './PeriodSelector.vue'
import StudyPlanSelector from './StudyPlanSelector.vue'

const router = useRouter()
const { t } = useI18n()
const selectionStore = useSelectionStore()
const coursesStore = useCoursesStore()
const { fetchStudyPlans, loading: plansLoading } = useStudyPlansApi()

const steps = computed(() => [
	{ number: 1, label: t('wizard.steps.faculty'), complete: !!selectionStore.faculty },
	{ number: 2, label: t('wizard.steps.period'), complete: !!selectionStore.year && !!selectionStore.semester },
	{ number: 3, label: t('wizard.steps.studyPlan'), complete: !!selectionStore.studyPlan },
])

// Load study plans when faculty and period are selected
watch(
	() => [selectionStore.faculty, selectionStore.year, selectionStore.semester],
	async ([faculty, year, semester]) => {
		if (faculty && year && semester) {
			selectionStore.setStudyPlansLoading(true)

			const response = await fetchStudyPlans({
				faculty_id: (faculty as Faculty).id,
				year: year as number,
				semester: semester as InSISSemester,
				limit: 100,
			})

			if (response) {
				selectionStore.setStudyPlans(response.data)
			}

			selectionStore.setStudyPlansLoading(false)
		}
	},
	{ immediate: true },
)

// Navigate to courses when selection is complete
function onComplete() {
	if (selectionStore.studyPlan) {
		// Set the study plan context in courses store
		coursesStore.setStudyPlanContext(selectionStore.studyPlan.id)
		router.push('/courses')
	}
}

function onStepClick(step: number) {
	if (step < selectionStore.currentStep) {
		selectionStore.resetToStep(step)
	}
}
</script>

<template>
	<div class="wizard-container">
		<!-- Wizard Steps Indicator -->
		<div class="insis-wizard-steps">
			<div
				v-for="step in steps"
				:key="step.number"
				class="insis-wizard-step"
				:class="{
					active: selectionStore.currentStep === step.number,
					complete: step.complete && selectionStore.currentStep > step.number,
					clickable: step.number < selectionStore.currentStep,
				}"
				@click="step.number < selectionStore.currentStep && onStepClick(step.number)"
			>
				<span class="step-number">
					<template v-if="step.complete && selectionStore.currentStep > step.number">✓</template>
					<template v-else>{{ step.number }}</template>
				</span>
				<span class="step-label">{{ step.label }}</span>
			</div>
		</div>

		<!-- Step Content -->
		<div class="wizard-content">
			<!-- Step 1: Faculty Selection -->
			<Transition name="fade" mode="out-in">
				<FacultySelector v-if="selectionStore.currentStep === 1" key="faculty" />

				<!-- Step 2: Period Selection -->
				<PeriodSelector v-else-if="selectionStore.currentStep === 2" key="period" />

				<!-- Step 3: Study Plan Selection -->
				<StudyPlanSelector v-else-if="selectionStore.currentStep === 3" key="plan" :loading="plansLoading || selectionStore.studyPlansLoading" />

				<!-- Step 4: Complete -->
				<div v-else key="complete" class="wizard-complete">
					<div class="insis-card">
						<div class="insis-card-header">
							{{ t('wizard.complete.title') }}
						</div>
						<div class="wizard-summary">
							<dl>
								<dt>{{ t('wizard.steps.faculty') }}:</dt>
								<dd>{{ selectionStore.faculty?.title }}</dd>

								<dt>{{ t('wizard.steps.period') }}:</dt>
								<dd>{{ selectionStore.semester }} {{ selectionStore.year }}</dd>

								<dt>{{ t('wizard.steps.studyPlan') }}:</dt>
								<dd>{{ selectionStore.studyPlan?.title }}</dd>
							</dl>

							<div class="wizard-actions">
								<button class="insis-btn" @click="selectionStore.reset()">
									{{ t('wizard.complete.change') }}
								</button>
								<button class="insis-btn insis-btn-primary" @click="onComplete">
									{{ t('wizard.complete.continue') }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</Transition>
		</div>
	</div>
</template>

<style scoped>
.wizard-container {
	max-width: 900px;
	margin: 0 auto;
	padding: 20px 0;
}

.wizard-content {
	margin-top: 24px;
}

.wizard-complete .wizard-summary {
	padding: 20px;
}

.wizard-summary dl {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 8px 16px;
	margin: 0 0 24px;
}

.wizard-summary dt {
	font-weight: 500;
	color: #555;
}

.wizard-summary dd {
	margin: 0;
	color: var(--color-insis-primary-dark);
}

.wizard-actions {
	display: flex;
	gap: 12px;
	justify-content: flex-end;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

/* Step click state */
.insis-wizard-step.clickable {
	cursor: pointer;
}

.insis-wizard-step.clickable:hover .step-number {
	background-color: var(--color-insis-primary);
	color: white;
}
</style>
