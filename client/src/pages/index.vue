<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToCourses() {
	router.push('/courses')
}
</script>

<template>
	<div class="landing-page">
		<!-- Header -->
		<header class="border-b border-[var(--insis-border)] bg-white">
			<div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="text-xl font-bold text-[var(--insis-blue)]">Kreditožrouti</div>
					<span class="text-xs text-[var(--insis-gray-500)]">Neoficiální vyhledávač předmětů VŠE</span>
				</div>
				<nav class="flex gap-4">
					<a href="/courses" class="text-sm hover:underline">Vyhledávání</a>
				</nav>
			</div>
		</header>

		<!-- Hero Section -->
		<section class="bg-[var(--insis-gray-100)] border-b border-[var(--insis-border)]">
			<div class="max-w-6xl mx-auto px-4 py-12">
				<h1 class="text-3xl font-bold text-[var(--insis-gray-900)] mb-4">Vyhledávejte předměty chytřeji</h1>
				<p class="text-lg text-[var(--insis-gray-600)] mb-6 max-w-2xl">
					Kreditožrouti je neoficiální nástroj pro studenty VŠE, který umožňuje pokročilé vyhledávání předmětů podle rozvrhu, fakulty, kreditů a
					dalších kritérií.
				</p>
				<button class="insis-btn insis-btn-primary insis-btn-lg" @click="goToCourses">Začít vyhledávat →</button>
			</div>
		</section>

		<!-- Features -->
		<section class="max-w-6xl mx-auto px-4 py-12">
			<h2 class="text-xl font-bold text-[var(--insis-gray-900)] mb-6">Co umí Kreditožrouti?</h2>

			<div class="grid md:grid-cols-3 gap-6">
				<div class="insis-panel">
					<h3 class="insis-panel-title">Vyhledávání podle rozvrhu</h3>
					<p class="text-sm text-[var(--insis-gray-600)]">
						Vyberte si časové okno, kdy máte volno, a najděte předměty, které se vám hodí do rozvrhu. Stačí táhnout myší přes tabulku rozvrhu.
					</p>
				</div>

				<div class="insis-panel">
					<h3 class="insis-panel-title">Filtrování podle studijního plánu</h3>
					<p class="text-sm text-[var(--insis-gray-600)]">
						Vyberte svůj studijní plán a uvidíte, které předměty jsou povinné, povinně volitelné nebo volitelné právě pro vás.
					</p>
				</div>

				<div class="insis-panel">
					<h3 class="insis-panel-title">Přehled v reálném čase</h3>
					<p class="text-sm text-[var(--insis-gray-600)]">
						Data jsou pravidelně aktualizována z InSIS, takže máte vždy aktuální informace o předmětech, rozvrzích a kapacitách.
					</p>
				</div>
			</div>
		</section>

		<!-- CTA -->
		<section class="bg-[var(--insis-blue-light)] border-y border-[var(--insis-border)]">
			<div class="max-w-6xl mx-auto px-4 py-8 text-center">
				<h2 class="text-xl font-bold text-[var(--insis-gray-900)] mb-4">Připraveni najít ideální předměty?</h2>
				<button class="insis-btn insis-btn-primary" @click="goToCourses">Spustit vyhledávání</button>
			</div>
		</section>

		<!-- Footer -->
		<footer class="max-w-6xl mx-auto px-4 py-6 text-center">
			<p class="text-xs text-[var(--insis-gray-500)]">
				Kreditožrouti je neoficiální studentský projekt. Není součástí VŠE ani InSIS.
				<br />
				Data jsou získávána z veřejně dostupných zdrojů.
			</p>
		</footer>
	</div>
</template>

<style scoped>
.landing-page {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}

section:last-of-type {
	flex-grow: 1;
}
</style>
