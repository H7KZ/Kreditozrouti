<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useHead, useSeoMeta } from '@unhead/vue'
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import ThemeToggle from '@client/components/common/ThemeToggle.vue'
import { i18n } from '@client/i18n'
import IconArrowRight from '~icons/lucide/arrow-right'
import IconBookOpen from '~icons/lucide/book-open'
import IconCalendar from '~icons/lucide/calendar'
import IconGraduationCap from '~icons/lucide/graduation-cap'
import IconInfo from '~icons/lucide/info'

const router = useRouter()

watch(
	() => i18n.global.locale.value,
	(locale) => {
		if (locale === 'en') router.push('/guide/en')
	},
)

useSeoMeta({
	title: 'Průvodce pro studenty – Kreditožrouti',
	description: 'Průvodce pro mezinárodní studenty VŠE Praha: jak funguje InSIS, kreditový systém VŠE a jak pomocí Kreditožroutů naplánovat rozvrh.',
	ogTitle: 'Průvodce pro studenty – Kreditožrouti',
	ogDescription: 'Naplánujte si rozvrh na VŠE Praha. InSIS a kreditový systém vysvětleny pro mezinárodní studenty.',
})

useHead({
	link: [
		{ rel: 'alternate', hreflang: 'en', href: 'https://kreditozrouti.cz/guide/en' },
		{ rel: 'alternate', hreflang: 'cs', href: 'https://kreditozrouti.cz/guide/cs' },
		{ rel: 'alternate', hreflang: 'x-default', href: 'https://kreditozrouti.cz/guide/en' },
		{ rel: 'canonical', href: 'https://kreditozrouti.cz/guide/cs' },
	],
})
</script>

<template>
	<div class="min-h-screen bg-(--insis-bg)">
		<header class="border-b border-(--insis-border) bg-(--insis-surface) px-4 py-3">
			<div class="mx-auto flex max-w-3xl items-center justify-between">
				<RouterLink to="/" class="text-lg font-bold text-(--insis-blue)">Kreditožrouti</RouterLink>
				<div class="flex items-center gap-2">
					<LanguageSwitcher />
					<ThemeToggle />
				</div>
			</div>
		</header>

		<main id="main-content" class="mx-auto max-w-3xl px-4 py-10">
			<h1 class="mb-2 text-3xl font-bold text-(--insis-gray-900)">Průvodce pro studenty</h1>
			<p class="mb-10 text-(--insis-gray-500)">Vše, co potřebujete k naplánování semestru na VŠE.</p>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconInfo class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">Co je InSIS?</h2>
				</div>
				<p class="text-(--insis-gray-700)">
					InSIS je informační systém VŠE Praha. Slouží k zápisu předmětů, zobrazení rozvrhů, kontrole výsledků a správě studijního plánu.
				</p>
			</section>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconGraduationCap class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">Kreditový systém VŠE</h2>
				</div>
				<p class="mb-3 text-(--insis-gray-700)">
					VŠE používá kreditový systém ECTS. Každý předmět má určitý počet kreditů a pro absolvování je nutné získat požadovaný celkový počet.
				</p>
				<ul class="space-y-2 text-(--insis-gray-700)">
					<li class="flex items-start gap-2">
						<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<span><strong>Povinné předměty</strong> jsou součástí vašeho studijního programu.</span>
					</li>
					<li class="flex items-start gap-2">
						<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<span><strong>Volitelné předměty</strong> vám umožňují doplnit kredity z širší nabídky.</span>
					</li>
					<li class="flex items-start gap-2">
						<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<span><strong>Zápisová okna</strong> se otevírají v konkrétní dny — naplánujte si rozvrh předem.</span>
					</li>
				</ul>
			</section>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconCalendar class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">Jak používat Kreditožrouti</h2>
				</div>
				<ol class="space-y-3 text-(--insis-gray-700)">
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">1</span>
						<span><strong>Vyberte studijní program</strong> v průvodci nastavením, aby aplikace věděla, které předměty jsou pro vás relevantní.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">2</span>
						<span><strong>Filtrujte předměty</strong> podle dne, času, jazyka nebo fakulty, abyste zúžili výběr.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">3</span>
						<span><strong>Přidejte předměty</strong> do rozvrhu a okamžitě zkontrolujte kolize.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">4</span>
						<span><strong>Vyřešte kolize</strong> výměnou časových bloků, dokud nemáte čistý rozvrh.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">5</span>
						<span><strong>Zapište se v InSIS</strong> — Kreditožrouti je pouze plánovací nástroj. Skutečný zápis probíhá v InSISu.</span>
					</li>
				</ol>
			</section>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconBookOpen class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">Co Kreditožrouti NEDĚLÁ</h2>
				</div>
				<ul class="space-y-2 text-(--insis-gray-700)">
					<li class="flex items-start gap-2">
						<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-(--insis-gray-400)" aria-hidden="true"></span>
						<span>Nezapisuje vás do předmětů v InSIS — to musíte udělat sami.</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-(--insis-gray-400)" aria-hidden="true"></span>
						<span>Nezobrazuje aktuální obsazenost míst.</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-(--insis-gray-400)" aria-hidden="true"></span>
						<span>Nespravuje studijní záznamy ani hodnocení.</span>
					</li>
				</ul>
			</section>

			<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-6 text-center">
				<p class="mb-4 text-(--insis-gray-700)">Připraveni naplánovat rozvrh?</p>
				<RouterLink to="/" class="insis-btn-primary inline-flex items-center gap-2">
					Otevřít Kreditožrouti
					<IconArrowRight class="h-4 w-4" aria-hidden="true" />
				</RouterLink>
			</div>
		</main>
	</div>
</template>
