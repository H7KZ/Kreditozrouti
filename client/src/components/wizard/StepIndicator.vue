<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Step {
	key: string
	label: string
	completed?: boolean
}

interface Props {
	currentStep: number
	totalSteps: number
	steps: Step[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
	<div class="w-full">
		<!-- Progress bar -->
		<div class="flex items-center justify-between mb-4">
			<template v-for="(step, index) in steps" :key="step.key">
				<!-- Step circle -->
				<div class="flex flex-col items-center flex-1">
					<div
						class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors"
						:class="{
							'bg-[#4a7eb8] border-[#4a7eb8] text-white': index < currentStep || step.completed,
							'bg-[#4a7eb8] border-[#4a7eb8] text-white ring-4 ring-[#4a7eb8]/20': index === currentStep,
							'bg-white border-[#a0b0c0] text-[#6b7280]': index > currentStep && !step.completed,
						}"
					>
						<template v-if="index < currentStep || step.completed">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</template>
						<template v-else>
							{{ index + 1 }}
						</template>
					</div>
					<span class="mt-2 text-xs text-center max-w-[100px]" :class="index <= currentStep ? 'text-[#2c5a8c] font-medium' : 'text-[#6b7280]'">
						{{ step.label }}
					</span>
				</div>

				<!-- Connector line -->
				<div v-if="index < steps.length - 1" class="flex-1 h-0.5 mx-2 -mt-6" :class="index < currentStep ? 'bg-[#4a7eb8]' : 'bg-[#d1d5db]'" />
			</template>
		</div>

		<!-- Step counter text -->
		<p class="text-center text-sm text-[#6b7280]">
			{{ t('wizard.step', { current: currentStep + 1, total: totalSteps }) }}
		</p>
	</div>
</template>
