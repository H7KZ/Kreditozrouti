<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSeoMeta } from '@unhead/vue'
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import ThemeToggle from '@client/components/common/ThemeToggle.vue'
import StudyPlanWizard from '@client/components/wizard/StudyPlanWizard.vue'
import { useWizardDataStore, useWizardStore } from '@client/stores'

const { t } = useI18n()
const router = useRouter()
const wizardStore = useWizardStore()
const wizardDataStore = useWizardDataStore()

useSeoMeta({
	title: () => `${t('pages.index.title')} – ${t('pages.index.subtitle')}`,
	description: () => t('pages.index.description'),
	ogTitle: () => `${t('pages.index.title')} – ${t('pages.index.subtitle')}`,
	ogDescription: () => t('pages.index.description'),
})

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
	<div class="flex min-h-screen flex-col bg-[var(--insis-bg)]">
		<!-- Header -->
		<header
			class="flex shrink-0 items-center justify-between border-b border-[var(--insis-border)] bg-[var(--insis-surface)] px-6 py-3 shadow-[var(--insis-shadow-sm)]"
		>
			<div class="flex items-center gap-3">
				<!-- Logo mark -->
				<img src="/logo/kreditozrouti-transparent-cropped.png" alt="K" class="flex h-8 w-8 shrink-0 items-center justify-center object-contain" />
				<div>
					<div class="text-[15px] font-semibold text-[var(--insis-blue)]">{{ $t('pages.index.title') }}</div>
					<div class="text-[11px] text-[var(--insis-text-3)]">{{ $t('pages.index.subtitle') }}</div>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<ThemeToggle />
				<LanguageSwitcher />
			</div>
		</header>

		<!-- Main Content -->
		<main
			class="flex flex-1 [scrollbar-width:thin] [scrollbar-color:var(--insis-border-mid)_transparent] items-start justify-center overflow-y-auto px-6 py-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--insis-border-mid)] [&::-webkit-scrollbar-track]:bg-transparent"
		>
			<div class="w-full max-w-[800px] rounded-lg border border-[var(--insis-border)] bg-[var(--insis-surface)] p-4 sm:p-8 shadow-[var(--insis-shadow)]">
				<!-- Title -->
				<div class="mb-6 text-center">
					<h2 class="mb-1 text-[17px] font-semibold text-[var(--insis-text)]">{{ $t('pages.index.welcome') }}</h2>
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
