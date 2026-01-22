<script setup lang="ts">
import { useStudentContext, type WizardStep } from '@client/stores/studentContext'
import type { FacetItem } from '@client/types/courses'
import type { StudyPlan } from '@client/types/studyPlans'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const studentContext = useStudentContext()
const { currentStep, isLoading, error, selectedFacultyId, selectedYear, selectedStudyPlan, availableFaculties, availableYears, studyPlans, isWizardComplete } =
	storeToRefs(studentContext)

const emit = defineEmits<{
	complete: [studyPlan: StudyPlan]
}>()

onMounted(() => {
	studentContext.initialize()
})

// Wizard step definitions
const steps: { id: WizardStep; label: string }[] = [
	{ id: 'faculty', label: 'Fakulta' },
	{ id: 'year', label: 'Rok' },
	{ id: 'studyPlan', label: 'Studijní plán' },
]

const currentStepIndex = computed(() => {
	if (currentStep.value === 'complete') return steps.length
	return steps.findIndex((s) => s.id === currentStep.value)
})

function getStepStatus(stepIndex: number): 'completed' | 'active' | 'pending' {
	if (stepIndex < currentStepIndex.value) return 'completed'
	if (stepIndex === currentStepIndex.value) return 'active'
	return 'pending'
}

function handleFacultySelect(faculty: FacetItem) {
	studentContext.selectFaculty(faculty.value as string)
}

function handleYearSelect(year: FacetItem) {
	studentContext.selectYear(year.value as number)
}

function handleStudyPlanSelect(plan: StudyPlan) {
	studentContext.selectStudyPlan(plan)
	emit('complete', plan)
}

function goBack(step: WizardStep) {
	studentContext.goToStep(step)
}
</script>

<template>
	<div class="insis-panel">
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
			<button class="insis-btn insis-btn-sm ml-2" @click="studentContext.initialize()">Zkusit znovu</button>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="insis-loading">
			<div class="insis-spinner"></div>
			<span class="ml-2">Načítání...</span>
		</div>

		<!-- Step 1: Faculty Selection -->
		<div v-else-if="currentStep === 'faculty'">
			<h3 class="insis-panel-title">Vyberte fakultu</h3>
			<p class="text-sm text-[var(--insis-gray-600)] mb-4">Zvolte fakultu, jejíž předměty chcete procházet.</p>

			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
				<button
					v-for="faculty in availableFaculties"
					:key="String(faculty.value)"
					class="insis-btn text-left justify-start"
					:class="{ 'insis-btn-primary': selectedFacultyId === faculty.value }"
					@click="handleFacultySelect(faculty)"
				>
					<span class="font-bold mr-2">{{ faculty.value }}</span>
					<span class="text-xs text-[var(--insis-gray-500)]">({{ faculty.count }})</span>
				</button>
			</div>
		</div>

		<!-- Step 2: Year Selection -->
		<div v-else-if="currentStep === 'year'">
			<div class="flex items-center gap-2 mb-4">
				<button class="insis-btn insis-btn-sm" @click="goBack('faculty')">← Zpět</button>
				<h3 class="insis-panel-title mb-0">Vyberte akademický rok</h3>
			</div>
			<p class="text-sm text-[var(--insis-gray-600)] mb-4">
				Fakulta: <strong>{{ selectedFacultyId }}</strong>
			</p>

			<div class="flex flex-wrap gap-2">
				<button
					v-for="year in availableYears"
					:key="String(year.value)"
					class="insis-btn"
					:class="{ 'insis-btn-primary': selectedYear === year.value }"
					@click="handleYearSelect(year)"
				>
					{{ year.value }}/{{ Number(year.value) + 1 }}
					<span class="text-xs ml-1">({{ year.count }})</span>
				</button>
			</div>
		</div>

		<!-- Step 3: Study Plan Selection -->
		<div v-else-if="currentStep === 'studyPlan'">
			<div class="flex items-center gap-2 mb-4">
				<button class="insis-btn insis-btn-sm" @click="goBack('year')">← Zpět</button>
				<h3 class="insis-panel-title mb-0">Vyberte studijní plán</h3>
			</div>
			<p class="text-sm text-[var(--insis-gray-600)] mb-4">
				Fakulta: <strong>{{ selectedFacultyId }}</strong> | Rok: <strong>{{ selectedYear }}/{{ Number(selectedYear) + 1 }}</strong>
			</p>

			<div v-if="studyPlans.length === 0" class="text-sm text-[var(--insis-gray-600)]">Žádné studijní plány nebyly nalezeny pro vybrané parametry.</div>

			<table v-else class="insis-table">
				<thead>
					<tr>
						<th>Kód</th>
						<th>Název</th>
						<th>Úroveň</th>
						<th>Forma</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="plan in studyPlans" :key="plan.id">
						<td class="insis-course-code">{{ plan.ident }}</td>
						<td>{{ plan.title }}</td>
						<td class="cell-center">{{ plan.level }}</td>
						<td class="cell-center">{{ plan.mode_of_study }}</td>
						<td class="cell-center">
							<button class="insis-btn insis-btn-sm insis-btn-primary" @click="handleStudyPlanSelect(plan)">Vybrat</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Complete State -->
		<div v-else-if="isWizardComplete && selectedStudyPlan">
			<div class="flex items-center justify-between mb-4">
				<h3 class="insis-panel-title mb-0">Vybraný studijní plán</h3>
				<button class="insis-btn insis-btn-sm" @click="studentContext.reset()">Změnit</button>
			</div>

			<div class="insis-panel-success">
				<div class="font-bold">{{ selectedStudyPlan.title }}</div>
				<div class="text-sm">
					<span class="insis-course-code">{{ selectedStudyPlan.ident }}</span>
					·
					{{ selectedStudyPlan.faculty_id }}
					·
					{{ selectedYear }}/{{ Number(selectedYear) + 1 }}
				</div>
			</div>
		</div>
	</div>
</template>
