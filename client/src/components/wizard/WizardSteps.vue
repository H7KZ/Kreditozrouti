<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCheck from '~icons/lucide/check'

/*
 * WizardSteps
 * Visual progress indicator for the wizard.
 */

const { t } = useI18n({ useScope: 'global' })

interface Props {
	currentStep: number
	step1Complete: boolean
	step2Complete: boolean
	step3Complete: boolean
}

interface Emits {
	(e: 'goToStep', step: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const steps = computed(() => [
	{ number: 1, label: t('components.wizard.WizardSteps.faculty') },
	{ number: 2, label: t('components.wizard.WizardSteps.enrollmentYear') },
	{ number: 3, label: t('components.wizard.WizardSteps.studyPlan') },
])

function isStepComplete(stepNumber: number): boolean {
	switch (stepNumber) {
		case 1:
			return props.step1Complete
		case 2:
			return props.step2Complete
		case 3:
			return props.step3Complete
		default:
			return false
	}
}

function isStepClickable(stepNumber: number): boolean {
	// Can always go back, or go to next if previous is complete
	if (stepNumber < props.currentStep) return true
	if (stepNumber === 2 && props.step1Complete) return true
	if (stepNumber === 3 && props.step2Complete) return true
	return false
}

function handleStepClick(stepNumber: number) {
	if (isStepClickable(stepNumber)) {
		emit('goToStep', stepNumber)
	}
}
</script>

<template>
	<div class="insis-wizard mb-8 justify-center">
		<template v-for="(step, index) in steps" :key="step.number">
			<!-- Step -->
			<div
				:class="[
					'insis-wizard-step',
					{
						active: currentStep === step.number,
						completed: isStepComplete(step.number),
						clickable: isStepClickable(step.number),
					},
				]"
				:role="isStepClickable(step.number) ? 'button' : undefined"
				:tabindex="isStepClickable(step.number) ? 0 : undefined"
				@click="handleStepClick(step.number)"
				@keydown.enter="handleStepClick(step.number)"
				@keydown.space.prevent="handleStepClick(step.number)"
			>
				<div class="insis-wizard-step-number">
					<IconCheck v-if="isStepComplete(step.number) && currentStep !== step.number" class="h-4 w-4" />
					<span v-else>{{ step.number }}</span>
				</div>
				<span class="insis-wizard-step-label">{{ step.label }}</span>
			</div>

			<!-- Connector -->
			<div v-if="index < steps.length - 1" :class="['insis-wizard-connector', { completed: isStepComplete(step.number) }]" />
		</template>
	</div>
</template>

<style scoped>
.insis-wizard-step.clickable {
	cursor: pointer;
}

.insis-wizard-step.clickable:hover .insis-wizard-step-number {
	transform: scale(1.05);
}

.insis-wizard-step-number {
	transition: transform 0.15s ease-in-out;
}

.insis-wizard-connector.completed {
	background-color: var(--insis-success);
}
</style>
