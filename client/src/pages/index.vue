<script setup lang="ts">
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import StudyPlanWizard from '@client/components/wizard/StudyPlanWizard.vue'
import { useWizardStore } from '@client/stores'
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

/*
 * Landing Page - Study Plan Wizard
 * First page users see, guides them through selecting their study plan.
 */

const router = useRouter()
const wizardStore = useWizardStore()

// If wizard is already completed, redirect to courses page
watch(
	() => wizardStore.completed,
	(completed) => {
		if (completed) {
			router.push('/courses')
		}
	},
	{ immediate: true },
)

onMounted(() => {
	// Load initial facets if not already loaded
	if (wizardStore.facultyFacets.length === 0) {
		wizardStore.loadInitialFacets()
	}
})
</script>

<template>
	<div class="min-h-screen bg-[var(--insis-bg)]">
		<!-- Header -->
		<header class="border-b border-[var(--insis-border)] bg-white px-4 py-3">
			<div class="mx-auto flex max-w-4xl items-center justify-between">
				<div class="flex items-center gap-4">
					<!-- Logo placeholder -->
					<div class="h-12 w-12 flex items-center justify-center">
						<img src="/logo/kreditozrouti-transparent-cropped.png" alt="K" class="pb-0.5" />
					</div>
					<div>
						<h1 class="text-lg font-semibold text-[var(--insis-blue)]">{{ $t('pages.index.title') }}</h1>
						<p class="text-xs text-[var(--insis-gray-500)]">{{ $t('pages.index.subtitle') }}</p>
					</div>
				</div>

				<div>
					<!-- I18n Switcher -->
					<LanguageSwitcher />
				</div>
			</div>
		</header>

		<!-- Main Content -->
		<main class="mx-auto max-w-4xl px-4 py-8">
			<!-- Introduction -->
			<div class="mb-8 text-center">
				<h2 class="mb-2 text-2xl font-semibold text-[var(--insis-text)]">{{ $t('pages.index.welcome') }}</h2>
				<p class="text-[var(--insis-gray-600)]">
					{{ $t('pages.index.description') }}
				</p>
			</div>

			<!-- Wizard Component -->
			<StudyPlanWizard />

			<!-- Info box -->
			<div class="mt-8 rounded border border-[var(--insis-border)] bg-white p-4">
				<h3 class="mb-2 text-sm font-medium text-[var(--insis-text)]">{{ $t('pages.index.howItWorks') }}</h3>
				<ul class="space-y-1 text-sm text-[var(--insis-gray-600)]">
					<li><strong>1.</strong> {{ $t('pages.index.step1') }}</li>
					<li><strong>2.</strong> {{ $t('pages.index.step2') }}</li>
					<li><strong>3.</strong> {{ $t('pages.index.step3') }}</li>
					<li><strong>4.</strong> {{ $t('pages.index.step4') }}</li>
				</ul>
			</div>
		</main>

		<!-- Footer -->
		<footer class="border-t border-[var(--insis-border)] bg-white px-4 py-4 text-center text-sm text-[var(--insis-gray-500)]">
			<p>
				{{ $t('pages.index.footer') }}
				<a href="https://insis.vse.cz" target="_blank" class="text-[var(--insis-blue)] hover:underline"> {{ $t('pages.index.insisLink') }} </a>
			</p>
		</footer>
	</div>
</template>
