<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSeoMeta } from '@unhead/vue'
import AppHeader from '@client/components/common/AppHeader.vue'
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
	ogDescription: () => t('pages.index.description')
})

watch(
	() => wizardStore.completed,
	completed => {
		if (completed) {
			router.push('/courses')
		}
	},
	{ immediate: true }
)

onMounted(() => {
	if (wizardDataStore.facultyFacets.length === 0) {
		wizardDataStore.loadInitialFacets()
	}
})
</script>

<template>
	<div class="flex min-h-screen flex-col bg-(--insis-bg)">
		<AppHeader />

		<!-- Main Content -->
		<main
			class="flex flex-1 scrollbar-thin [scrollbar-color:var(--insis-border-mid)_transparent] items-start justify-center overflow-y-auto px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-(--insis-border-mid) [&::-webkit-scrollbar-track]:bg-transparent"
		>
			<div class="w-full max-w-[800px] rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 shadow-(--insis-shadow) sm:p-8">
				<!-- Title -->
				<div class="mb-6 text-center">
					<h2 class="mb-1 text-[17px] font-semibold text-(--insis-text)">{{ $t('pages.index.welcome') }}</h2>
					<p class="text-sm text-(--insis-text-3)">{{ $t('pages.index.description') }}</p>
				</div>

				<!-- Wizard Component -->
				<StudyPlanWizard />

				<!-- How it works -->
				<div class="mt-6 rounded border border-(--insis-border) bg-(--insis-surface-2) p-4">
					<h3 class="mb-2 text-[12.5px] font-semibold text-(--insis-text)">{{ $t('pages.index.howItWorks') }}</h3>
					<ul class="space-y-1 text-xs text-(--insis-text-2)">
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
