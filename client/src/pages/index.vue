<script setup lang="ts">
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import StudyPlanWizard from '@client/components/wizard/StudyPlanWizard.vue'
import { useWizardDataStore, useWizardStore } from '@client/stores'
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const wizardStore = useWizardStore()
const wizardDataStore = useWizardDataStore()

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
	if (wizardDataStore.facultyFacets.length === 0) {
		wizardDataStore.loadInitialFacets()
	}
})
</script>

<template>
	<div class="min-h-screen bg-[var(--insis-bg)] flex flex-col">
		<!-- Header -->
		<header
			class="bg-[var(--insis-surface)] border-b border-[var(--insis-border)] py-3 px-6 flex items-center justify-between shadow-[var(--insis-shadow-sm)] shrink-0"
		>
			<div class="flex items-center gap-3">
				<!-- Logo mark -->
				<div class="w-[30px] h-[30px] bg-[var(--insis-blue)] rounded-[5px] flex items-center justify-center shrink-0">
					<img src="/logo/kreditozrouti-transparent-cropped.png" alt="K" class="h-4 w-4 object-contain brightness-0 invert" />
				</div>
				<div>
					<div class="text-[15px] font-semibold text-[var(--insis-blue)]">{{ $t('pages.index.title') }}</div>
					<div class="text-[11px] text-[var(--insis-text-3)]">{{ $t('pages.index.subtitle') }}</div>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<LanguageSwitcher />
			</div>
		</header>

		<!-- Main Content -->
		<main class="flex-1 flex items-start justify-center py-10 px-6">
			<div class="bg-[var(--insis-surface)] border border-[var(--insis-border)] rounded-lg p-8 max-w-[800px] w-full shadow-[var(--insis-shadow)]">
				<!-- Title -->
				<div class="mb-6 text-center">
					<h2 class="text-[17px] font-semibold text-[var(--insis-text)] mb-1">{{ $t('pages.index.welcome') }}</h2>
					<p class="text-sm text-[var(--insis-text-3)]">{{ $t('pages.index.description') }}</p>
				</div>

				<!-- Wizard Component -->
				<StudyPlanWizard />

				<!-- How it works -->
				<div class="mt-6 rounded border border-[var(--insis-border)] bg-[var(--insis-surface-2)] p-4">
					<h3 class="mb-2 text-[12.5px] font-semibold text-[var(--insis-text)]">{{ $t('pages.index.howItWorks') }}</h3>
					<ul class="space-y-1 text-[12px] text-[var(--insis-text-2)]">
						<li><strong>1.</strong> {{ $t('pages.index.step1') }}</li>
						<li><strong>2.</strong> {{ $t('pages.index.step2') }}</li>
						<li><strong>3.</strong> {{ $t('pages.index.step3') }}</li>
						<li><strong>3b.</strong> {{ $t('pages.index.step3b') }}</li>
						<li><strong>4.</strong> {{ $t('pages.index.step4') }}</li>
					</ul>
				</div>
			</div>
		</main>
	</div>
</template>
