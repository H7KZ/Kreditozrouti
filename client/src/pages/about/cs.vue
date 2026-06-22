<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useHead, useSeoMeta } from '@unhead/vue'
import AppHeader from '@client/components/common/AppHeader.vue'
import { i18n } from '@client/i18n'
import IconBookmark from '~icons/lucide/bookmark'
import IconBuilding2 from '~icons/lucide/building-2'
import IconCheckCircle2 from '~icons/lucide/check-circle-2'
import IconFilter from '~icons/lucide/filter'
import IconGlobe from '~icons/lucide/globe'
import IconShieldCheck from '~icons/lucide/shield-check'

const router = useRouter()

watch(
	() => i18n.global.locale.value,
	locale => {
		if (locale === 'en') router.push('/about/en')
	}
)

useSeoMeta({
	title: 'Bezkonfliktní rozvrh VŠE za pár minut – Kreditožrouti',
	description:
		'Sestav bezkonfliktní rozvrh na VŠE Praha bez stresu. Filtruj předměty InSIS podle dne, času a jazyka výuky, detekuj kolize rozvrhů a plánuj zápisy dopředu. Zdarma, bez registrace.',
	ogTitle: 'Kreditožrouti – Bezkonfliktní rozvrh VŠE',
	ogDescription: 'Vizuální rozvrhovač pro studenty VŠE Praha. Filtruj předměty, detekuj kolize a plánuj zápisy. Zdarma.'
})

useHead({
	link: [
		{ rel: 'alternate', hreflang: 'cs', href: 'https://kreditozrouti.cz/about/cs' },
		{ rel: 'alternate', hreflang: 'en', href: 'https://kreditozrouti.cz/about/en' },
		{ rel: 'alternate', hreflang: 'x-default', href: 'https://kreditozrouti.cz/about/cs' },
		{ rel: 'canonical', href: 'https://kreditozrouti.cz/about/cs' }
	],
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'Jak sestavit bezkonfliktní rozvrh na VŠE?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Kreditožrouti zobrazí všechny předměty z tvého studijního plánu na jednom místě. Vybereš si rozvrhové akce kliknutím — aplikace okamžitě ukáže, které se překrývají. Stačí zvolit jiné cvičení nebo přednášku a konflikt zmizí.'
						}
					},
					{
						'@type': 'Question',
						name: 'Jak fungují zápisy na VŠE?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Zápisy probíhají v několika vlnách podle počtu získaných kreditů. Studenti s více kredity mají přístup dříve a mohou obsadit místa v oblíbených rozvrhových akcích. V Kreditožroutech si lze rozvrh sestavit předem a v moment otevření zápisů zadat vše rychle do InSISu.'
						}
					},
					{
						'@type': 'Question',
						name: 'Co jsou kreditožrouti a proč jsou problém?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Kreditožrouti jsou předměty, které studentům spotřebují rezervní kredity — buď kvůli neúspěchu u zkoušky, nebo kvůli náročnosti celého semestru. Kreditožrouti (aplikace) ti pomůže sestavit rozvrh tak, abys věděl, do čeho jdeš.'
						}
					},
					{
						'@type': 'Question',
						name: 'Čím se Kreditožrouti liší od InSISu?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'InSIS je oficiální systém VŠE — nutný pro finální zápis. Kreditožrouti je pomocný nástroj, který ti umožňuje prohlédnout si všechny dostupné předměty najednou, filtrovat je a sestavit si rozvrh ještě před tím, než InSIS otevřeš. Šetří hodiny přepínání mezi záložkami.'
						}
					},
					{
						'@type': 'Question',
						name: 'Je aplikace zdarma?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Ano, Kreditožrouti je zcela zdarma a nevyžaduje registraci ani přihlášení. Stačí přejít na kreditozrouti.cz a vybrat svůj studijní plán.'
						}
					},
					{
						'@type': 'Question',
						name: 'Pro které fakulty aplikace funguje?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Kreditožrouti funguje pro všechny fakulty VŠE Praha: FIS, NF, FPH, FMV, FFÚ, FMJH i pro ostatní programy včetně zahraničních studentů. Data jsou pravidelně aktualizována z InSISu.'
						}
					}
				]
			})
		}
	]
})
</script>

<template>
	<div class="flex min-h-screen flex-col bg-(--insis-bg)">
		<AppHeader />

		<main class="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
			<!-- Hero -->
			<section class="mb-16 text-center">
				<h1 class="mb-4 text-3xl font-semibold text-(--insis-blue) sm:text-4xl">Bezkonfliktní rozvrh VŠE za pár minut</h1>
				<p class="mx-auto mb-8 max-w-2xl text-base text-(--insis-text-2)">
					Kreditožrouti nahrazuje hodiny přepínání záložek v InSISu. Zobrazí všechny předměty tvého studijního plánu najednou, detekuje kolize
					automaticky a umožní ti sestavit rozvrh ještě před samotným zápisem.
				</p>
				<RouterLink to="/" class="insis-btn-primary px-6 py-2.5 text-sm">Spustit aplikaci →</RouterLink>
			</section>

			<!-- How it works -->
			<section class="mb-16">
				<h2 class="mb-8 text-xl font-semibold text-(--insis-blue)">Jak to funguje</h2>
				<ol class="grid gap-4 sm:grid-cols-2">
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">1</span>
						<div>
							<p class="font-medium text-(--insis-text)">Vyber fakultu a studijní plán</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">Průvodce tě provede výběrem fakulty, roku nástupu a oboru. Trvá to dvě minuty.</p>
						</div>
					</li>
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">2</span>
						<div>
							<p class="font-medium text-(--insis-text)">Filtruj předměty</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">Filtruj podle dne, času, jazyka výuky, vyučujícího nebo ECTS kreditů.</p>
						</div>
					</li>
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">3</span>
						<div>
							<p class="font-medium text-(--insis-text)">Sestav si rozvrh</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">Klikni na rozvrhové akce a sleduj, jak se tvůj rozvrh sestavuje v reálném čase.</p>
						</div>
					</li>
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">4</span>
						<div>
							<p class="font-medium text-(--insis-text)">Zkontroluj konflikty</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">
								Kolize se zobrazí okamžitě. Vyřeš je před zápisem — ne až při samotném klikání v InSISu.
							</p>
						</div>
					</li>
				</ol>
			</section>

			<!-- Features -->
			<section class="mb-16">
				<h2 class="mb-8 text-xl font-semibold text-(--insis-blue)">Co aplikace umí</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconShieldCheck class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Detekce kolizí</h3>
						<p class="text-sm text-(--insis-text-2)">Překrývající se rozvrhové akce se označí automaticky. Nic nezmeškáš.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconFilter class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Filtrování tažením</h3>
						<p class="text-sm text-(--insis-text-2)">Přetáhni myší přes časovou osu a okamžitě skryj předměty mimo tvůj volný čas.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconBookmark class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Uložené rozvrhy</h3>
						<p class="text-sm text-(--insis-text-2)">Tvůj rozvrh se ukládá automaticky. Vrátíš se k němu kdykoli.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconGlobe class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Čeština i angličtina</h3>
						<p class="text-sm text-(--insis-text-2)">Rozhraní funguje v češtině i angličtině — ideální pro zahraniční studenty.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconBuilding2 class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Filtr fakult</h3>
						<p class="text-sm text-(--insis-text-2)">Zobrazuj předměty jen ze svého oboru nebo kombinuj více studijních plánů.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconCheckCircle2 class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Splněné předměty</h3>
						<p class="text-sm text-(--insis-text-2)">Označ předměty, které jsi už absolvoval, a vyfiltruj je z nabídky.</p>
					</div>
				</div>
			</section>

			<!-- FAQ -->
			<section class="mb-16">
				<h2 class="mb-8 text-xl font-semibold text-(--insis-blue)">Časté dotazy</h2>
				<div class="space-y-6">
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Jak sestavit bezkonfliktní rozvrh na VŠE?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Kreditožrouti zobrazí všechny předměty z tvého studijního plánu na jednom místě. Vybereš si rozvrhové akce kliknutím — aplikace
							okamžitě ukáže, které se překrývají. Stačí zvolit jiné cvičení nebo přednášku a konflikt zmizí.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Jak fungují zápisy na VŠE?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Zápisy probíhají v několika vlnách podle počtu získaných kreditů. Studenti s více kredity mají přístup dříve a mohou obsadit místa v
							oblíbených rozvrhových akcích. V Kreditožroutech si lze rozvrh sestavit předem a v moment otevření zápisů zadat vše rychle do
							InSISu.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Co jsou kreditožrouti a proč jsou problém?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Kreditožrouti jsou předměty, které studentům spotřebují rezervní kredity — buď kvůli neúspěchu u zkoušky, nebo kvůli náročnosti
							celého semestru. Kreditožrouti (aplikace) ti pomůže sestavit rozvrh tak, abys věděl, do čeho jdeš.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Čím se Kreditožrouti liší od InSISu?</h3>
						<p class="text-sm text-(--insis-text-2)">
							InSIS je oficiální systém VŠE — nutný pro finální zápis. Kreditožrouti je pomocný nástroj, který ti umožňuje prohlédnout si všechny
							dostupné předměty najednou, filtrovat je a sestavit si rozvrh ještě před tím, než InSIS otevřeš. Šetří hodiny přepínání mezi
							záložkami.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Je aplikace zdarma?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Ano, Kreditožrouti je zcela zdarma a nevyžaduje registraci ani přihlášení. Stačí přejít na kreditozrouti.cz a vybrat svůj studijní
							plán.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Pro které fakulty aplikace funguje?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Kreditožrouti funguje pro všechny fakulty VŠE Praha: FIS, NF, FPH, FMV, FFÚ, FMJH i pro ostatní programy včetně zahraničních
							studentů. Data jsou pravidelně aktualizována z InSISu.
						</p>
					</div>
				</div>
			</section>

			<!-- Bottom CTA -->
			<section class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-8 text-center">
				<h2 class="mb-3 text-xl font-semibold text-(--insis-blue)">Připraven na zápisy?</h2>
				<p class="mb-6 text-sm text-(--insis-text-2)">Žádná registrace, žádné přihlašování. Jen vyber studijní plán a začni.</p>
				<RouterLink to="/" class="insis-btn-primary px-6 py-2.5 text-sm">Spustit Kreditožrouti →</RouterLink>
			</section>
		</main>
	</div>
</template>
