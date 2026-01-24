<script setup lang="ts">
/**
 * Landing Page - Study Plan Wizard
 * First page users see, guides them through selecting their study plan.
 */
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import StudyPlanWizard from '@client/components/wizard/StudyPlanWizard.vue'
import { useWizardStore } from '@client/stores'

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
			<div class="mx-auto max-w-4xl">
				<div class="flex items-center gap-3">
					<!-- Logo placeholder -->
					<div class="flex h-10 w-10 items-center justify-center rounded bg-[var(--insis-blue)] text-white">
						<span class="text-lg font-bold">K</span>
					</div>
					<div>
						<h1 class="text-lg font-semibold text-[var(--insis-blue)]">Kreditožrouti</h1>
						<p class="text-xs text-[var(--insis-gray-500)]">Vyhledávač předmětů VŠE</p>
					</div>
				</div>
			</div>
		</header>

		<!-- Main Content -->
		<main class="mx-auto max-w-4xl px-4 py-8">
			<!-- Introduction -->
			<div class="mb-8 text-center">
				<h2 class="mb-2 text-2xl font-semibold text-[var(--insis-text)]">Vítejte v Kreditožroutech</h2>
				<p class="text-[var(--insis-gray-600)]">
					Pro začátek vyberte svůj studijní plán. Podle něj vám zobrazíme relevantní předměty a jejich rozvrhové akce.
				</p>
			</div>

			<!-- Wizard Component -->
			<StudyPlanWizard />

			<!-- Info box -->
			<div class="mt-8 rounded border border-[var(--insis-border)] bg-white p-4">
				<h3 class="mb-2 text-sm font-medium text-[var(--insis-text)]">📌 Jak to funguje?</h3>
				<ul class="space-y-1 text-sm text-[var(--insis-gray-600)]">
					<li><strong>1.</strong> Vyberte svou fakultu</li>
					<li><strong>2.</strong> Zvolte rok nástupu ke studiu</li>
					<li><strong>3.</strong> Vyberte svůj studijní plán</li>
					<li><strong>4.</strong> Procházejte předměty a sestavte si rozvrh</li>
				</ul>
			</div>
		</main>

		<!-- Footer -->
		<footer class="border-t border-[var(--insis-border)] bg-white px-4 py-4 text-center text-sm text-[var(--insis-gray-500)]">
			<p>
				Kreditožrouti · Data z
				<a href="https://insis.vse.cz" target="_blank" class="text-[var(--insis-blue)] hover:underline"> InSIS VŠE </a>
			</p>
		</footer>
	</div>
</template>
