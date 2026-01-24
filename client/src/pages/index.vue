<script setup lang="ts">
import AppLogo from '@client/components/AppLogo.vue'
import LanguageSwitcher from '@client/components/LanguageSwitcher.vue'
import StepIndicator from '@client/components/wizard/StepIndicator.vue'
import { useStudentContext } from '@client/stores/studentContext'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()
const studentContext = useStudentContext()

// Define wizard steps
const wizardSteps = computed(() => [
	{ key: 'faculty', label: t('wizard.steps.faculty') },
	{ key: 'year', label: t('wizard.steps.year') },
	{ key: 'studyPlan', label: t('wizard.steps.studyPlan') },
])

// Navigation handlers
const startWizard = () => {
	// Initialize context and navigate to courses (wizard is embedded there)
	studentContext.reset()
	router.push('/courses')
}

const skipToSearch = () => {
	// Skip wizard and go directly to courses
	studentContext.skipWizard()
	router.push('/courses')
}
</script>

<template>
	<div class="min-h-screen bg-[#f5f7fa] flex flex-col">
		<!-- Header -->
		<header class="bg-white border-b border-[#d1d5db] px-6 py-4">
			<div class="max-w-4xl mx-auto flex items-center justify-between">
				<AppLogo size="md" variant="full" />

				<!-- Language switcher -->
				<LanguageSwitcher />
			</div>
		</header>

		<!-- Main Content -->
		<main class="flex-1 flex items-center justify-center p-6">
			<div class="max-w-2xl w-full">
				<!-- Hero Card -->
				<div class="bg-white rounded-lg shadow-sm border border-[#d1d5db] overflow-hidden">
					<!-- Card Header with gradient -->
					<div class="bg-gradient-to-r from-[#4a7eb8] to-[#2c5a8c] px-8 py-6 text-white">
						<h1 class="text-2xl font-semibold mb-2">
							{{ t('wizard.title') }}
						</h1>
						<p class="text-white/90">
							{{ t('wizard.subtitle') }}
						</p>
					</div>

					<!-- Card Body -->
					<div class="p-8">
						<!-- Step Preview -->
						<div class="mb-8">
							<StepIndicator :current-step="-1" :total-steps="3" :steps="wizardSteps" />
						</div>

						<!-- Benefits/Features List -->
						<div class="mb-8 space-y-3">
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-[#4a7eb8] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<span class="text-[#374151]">{{ t('landing.features.studyPlan.description') }}</span>
							</div>
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-[#4a7eb8] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<span class="text-[#374151]">{{ t('landing.features.timetable.description') }}</span>
							</div>
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-[#4a7eb8] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<span class="text-[#374151]">{{ t('landing.features.realtime.description') }}</span>
							</div>
						</div>

						<!-- Primary Action -->
						<button class="insis-btn insis-btn-primary w-full py-3 text-base font-medium cursor-pointer" @click="startWizard">
							{{ t('wizard.next') }} →
						</button>
					</div>

					<!-- Card Footer - Skip Option -->
					<div class="border-t border-[#e5e7eb] bg-[#f9fafb] px-8 py-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-[#6b7280]">
									{{ t('wizard.skipDescription') }}
								</p>
							</div>
							<button class="insis-btn-text text-sm cursor-pointer" @click="skipToSearch">
								{{ t('wizard.skip') }}
							</button>
						</div>
					</div>
				</div>

				<!-- Additional info -->
				<p class="mt-6 text-center text-xs text-[#9ca3af]">
					{{ t('app.tagline') }}
				</p>
			</div>
		</main>
	</div>
</template>
