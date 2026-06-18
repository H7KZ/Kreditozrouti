<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useHead, useSeoMeta } from '@unhead/vue'
import AppHeader from '@client/components/common/AppHeader.vue'
import { i18n } from '@client/i18n'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconArrowRight from '~icons/lucide/arrow-right'
import IconCalendar from '~icons/lucide/calendar'
import IconClock from '~icons/lucide/clock'
import IconExternalLink from '~icons/lucide/external-link'
import IconGraduationCap from '~icons/lucide/graduation-cap'
import IconInfo from '~icons/lucide/info'
import IconLink from '~icons/lucide/link'
import IconMapPin from '~icons/lucide/map-pin'
import IconYoutube from '~icons/lucide/youtube'

const router = useRouter()

watch(
	() => i18n.global.locale.value,
	(locale) => {
		if (locale === 'en') router.push('/guide/en')
	},
)

useSeoMeta({
	title: 'Průvodce pro studenty – Kreditožrouti',
	description: 'Kompletní průvodce pro studenty VŠE Praha: kreditový systém, registrace předmětů v InSIS a jak používat Kreditožrouti k plánování rozvrhu.',
	ogTitle: 'Průvodce pro studenty – Kreditožrouti',
	ogDescription: 'Kreditový systém, registrace a InSIS vysvětleny krok za krokem. Plánujte rozvrh na VŠE Praha.',
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
	<div class="min-h-screen bg-(--insis-bg)" lang="cs">
		<AppHeader />

		<main id="main-content" class="mx-auto max-w-4xl px-4 py-10">
			<h1 class="mb-2 text-3xl font-bold text-(--insis-gray-900)">Průvodce pro studenty</h1>
			<p class="mb-8 text-(--insis-gray-500)">
				Vše, co potřebuješ vědět pro úspěšný start na VŠE — od kreditů přes Kreditožrouti až po zápis v InSISu.
			</p>

			<!-- TOC -->
			<nav
				class="mb-12 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5"
				aria-label="Obsah průvodce"
			>
				<p class="mb-3 font-semibold text-(--insis-gray-900)">V tomto průvodci</p>
				<ol class="space-y-1 text-sm">
					<li><a href="#credits" class="text-(--insis-blue) hover:underline">1. Kreditový systém VŠE</a></li>
					<li><a href="#campus" class="text-(--insis-blue) hover:underline">2. Areály školy</a></li>
					<li><a href="#enrollment" class="text-(--insis-blue) hover:underline">3. Registrace a zápisy</a></li>
					<li><a href="#tool" class="text-(--insis-blue) hover:underline">4. Kreditožrouti – průvodce nástrojem</a></li>
					<li><a href="#insis" class="text-(--insis-blue) hover:underline">5. Zápis předmětů v InSISu</a></li>
					<li><a href="#links" class="text-(--insis-blue) hover:underline">6. Užitečné odkazy</a></li>
				</ol>
			</nav>

			<!-- ── 1. Credits ─────────────────────────────────────── -->
			<section id="credits" class="mb-14" aria-labelledby="h-credits">
				<div class="mb-4 flex items-center gap-2">
					<IconGraduationCap class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-credits" class="text-2xl font-bold text-(--insis-gray-900)">1. Kreditový systém VŠE</h2>
				</div>

				<p class="mb-4 text-(--insis-gray-700)">
					Na začátku bakalářského studia dostaneš <strong>216 kreditových poukázek</strong>. Ty fungují jako
					„vysokoškolská měna" — za každý zapsaný předmět zaplatíš poukázky odpovídající počtu jeho kreditů.
					Pokud předmět úspěšně splníš, přičtou se ti kredity na konto. Pro získání bakalářského titulu
					potřebuješ nasbírat <strong>180 kreditů</strong> rozdělených do předepsaných kategorií.
				</p>

				<div class="mb-6 flex gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4">
					<IconInfo class="mt-0.5 h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
					<p class="text-sm text-(--insis-gray-700)">
						<strong>Pravidlo 20 kreditů za semestr:</strong> ke konci každého semestru musíš mít v součtu
						odstudováno alespoň <code class="rounded bg-(--insis-border) px-1">semestr × 20</code> kreditů.
						Pokud za tuto hranici spadneš, jsou ti z poukázek odečteny kredity za chybějící počet — tzv. penalizace.
					</p>
				</div>

				<h3 class="mb-3 font-semibold text-(--insis-gray-900)">Typy předmětů</h3>
				<div class="mb-6 overflow-x-auto rounded-lg border border-(--insis-border)">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-(--insis-surface) text-left text-(--insis-gray-500)">
								<th class="px-4 py-2 font-medium">Zkratka</th>
								<th class="px-4 py-2 font-medium">Typ</th>
								<th class="px-4 py-2 font-medium">Co to znamená</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-(--insis-border) text-(--insis-gray-700)">
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">oP</td>
								<td class="px-4 py-2">Povinný</td>
								<td class="px-4 py-2">Musíš splnit všechny předměty ze seznamu.</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">oV</td>
								<td class="px-4 py-2">Povinně volitelný</td>
								<td class="px-4 py-2">
									Vyber si libovolné předměty z nabídky, dokud nedosáhneš požadovaného počtu kreditů.
								</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">oJ1</td>
								<td class="px-4 py-2">Jazykový – 1. jazyk</td>
								<td class="px-4 py-2">
									Na FIS je to angličtina — celkem 12 kreditů (4 předměty × 3 kr). Na jiných fakultách může být jinak.
								</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">TV</td>
								<td class="px-4 py-2">Tělesná výchova</td>
								<td class="px-4 py-2">
									0 kreditů, nestojí žádné poukázky. Za celé bakalářské studium musíš splnit 2 semestry.
								</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">cVB</td>
								<td class="px-4 py-2">Celoškolsky volně volitelný</td>
								<td class="px-4 py-2">Nezapočítává se do titulu — studuješ nad rámec povinností.</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mb-3 font-semibold text-(--insis-gray-900)">Hodnocení</h3>
				<div class="mb-4 overflow-x-auto rounded-lg border border-(--insis-border)">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-(--insis-surface) text-left text-(--insis-gray-500)">
								<th class="px-4 py-2 font-medium">Body</th>
								<th class="px-4 py-2 font-medium">Známka</th>
								<th class="px-4 py-2 font-medium">Poznámka</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-(--insis-border) text-(--insis-gray-700)">
							<tr>
								<td class="px-4 py-2">90–100</td>
								<td class="px-4 py-2 font-semibold">1</td>
								<td class="px-4 py-2">—</td>
							</tr>
							<tr>
								<td class="px-4 py-2">75–89</td>
								<td class="px-4 py-2 font-semibold">2</td>
								<td class="px-4 py-2">—</td>
							</tr>
							<tr>
								<td class="px-4 py-2">60–74</td>
								<td class="px-4 py-2 font-semibold">3</td>
								<td class="px-4 py-2">—</td>
							</tr>
							<tr>
								<td class="px-4 py-2">50–59</td>
								<td class="px-4 py-2 font-semibold">4+</td>
								<td class="px-4 py-2">Jedna opravná zkouška ve stejném zkouškovém období</td>
							</tr>
							<tr>
								<td class="px-4 py-2">0–49</td>
								<td class="px-4 py-2 font-semibold">4</td>
								<td class="px-4 py-2">Nesplněno</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>Specialita VŠE – známka 4+:</strong> Pokud získáš 50–59 bodů, dostaneš 4+ a máš nárok
						na jeden opravný pokus zkoušky ještě během probíhajícího zkouškového období. Pokud uspěješ
						(60+ bodů), 4+ se smaže. Pokud neuspěješ nebo pokus nevyužiješ, dostaneš 4.
					</p>
				</div>

				<h3 class="mb-3 font-semibold text-(--insis-gray-900)">Videa k tématu</h3>
				<div class="space-y-3">
					<a
						href="https://www.youtube.com/watch?v=7AZ9Txwfgb8"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconYoutube class="h-6 w-6 shrink-0 text-red-500" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">Kreditový systém na VŠE</div>
							<div class="text-sm text-(--insis-gray-500)">
								Videopříručky FIS – kreditové poukázky, 180 kreditů a cesta k titulu
							</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://www.youtube.com/watch?v=ep-SdjuNHE4"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconYoutube class="h-6 w-6 shrink-0 text-red-500" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">Předměty a studijní plány</div>
							<div class="text-sm text-(--insis-gray-500)">
								Videopříručky FIS – povinné, volitelné, jazyky, tělocvik a studijní plán
							</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://www.youtube.com/watch?v=U7IocauH3cY"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconYoutube class="h-6 w-6 shrink-0 text-red-500" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">Hodnocení z předmětů</div>
							<div class="text-sm text-(--insis-gray-500)">
								Videopříručky FIS – bodový systém, grading, 4+ a jak předmět splnit
							</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- ── 2. Campus ──────────────────────────────────────── -->
			<section id="campus" class="mb-14" aria-labelledby="h-campus">
				<div class="mb-4 flex items-center gap-2">
					<IconMapPin class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-campus" class="text-2xl font-bold text-(--insis-gray-900)">2. Areály školy</h2>
				</div>

				<p class="mb-4 text-(--insis-gray-700)">VŠE má výuku ve dvou oddělených areálech v Praze:</p>

				<div class="mb-4 grid gap-4 sm:grid-cols-2">
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4">
						<p class="mb-1 font-semibold text-(--insis-gray-900)">Žižkov (hlavní kampus)</p>
						<p class="text-sm text-(--insis-gray-500)">Náměstí W. Churchilla, Praha 3</p>
						<p class="mt-2 text-sm text-(--insis-gray-700)">
							Místnosti začínají na:
							<span class="font-mono font-semibold">RB, NB, SB, IB</span>
						</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4">
						<p class="mb-1 font-semibold text-(--insis-gray-900)">Jižní Město</p>
						<p class="text-sm text-(--insis-gray-500)">Jižní Město, Praha 4</p>
						<p class="mt-2 text-sm text-(--insis-gray-700)">
							Místnosti začínají na:
							<span class="font-mono font-semibold">JM</span>
						</p>
					</div>
				</div>

				<div class="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>Pozor na přejezdy!</strong> Cesta mezi Žižkovem a Jižním Městem trvá přibližně
						<strong>45 minut</strong> MHD. Nikdy si nezapisuj předměty v různých areálech s méně než
						jedním volným blokem mezi sebou — stihnout přejezd za 15 minut je prakticky nemožné.
					</p>
				</div>
			</section>

			<!-- ── 3. Enrollment ──────────────────────────────────── -->
			<section id="enrollment" class="mb-14" aria-labelledby="h-enrollment">
				<div class="mb-4 flex items-center gap-2">
					<IconClock class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-enrollment" class="text-2xl font-bold text-(--insis-gray-900)">3. Registrace a zápisy</h2>
				</div>

				<p class="mb-6 text-(--insis-gray-700)">
					Předměty se nezapisují najednou — probíhají dvě oddělené fáze před začátkem každého semestru.
					Termíny najdeš v harmonogramu akademického roku na stránkách VŠE.
				</p>

				<ol class="mb-6 space-y-6">
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>1</span
						>
						<div>
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Registrace</h3>
							<p class="text-(--insis-gray-700)">
								Vyjádříš zájem o předměty a vybereš preferované časy přednášek a cvičení. V registracích
								lze zvolit i přeplněná cvičení — systém to zatím neřeší.
							</p>
						</div>
					</li>
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>2</span
						>
						<div>
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Automatický zápis (3 kola)</h3>
							<p class="mb-2 text-(--insis-gray-700)">
								Systém automaticky přidělí místa na základě priorit. Pokud je o cvičení větší zájem než
								kapacita, rozhoduje:
							</p>
							<ul class="space-y-1 text-sm text-(--insis-gray-700)">
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>Studenti s předregistrovanými předměty od fakulty (prváci) mají nejvyšší prioritu</span>
								</li>
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>Vyšší počet získaných kreditů → vyšší priorita</span>
								</li>
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>Nižší počet ztracených poukázek → vyšší priorita</span>
								</li>
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>Nerozhodnost → generátor náhodných čísel</span>
								</li>
							</ul>
						</div>
					</li>
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>3</span
						>
						<div>
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Ruční zápis</h3>
							<p class="text-(--insis-gray-700)">
								Po automatickém zápisu si můžeš ručně upravit rozvrh — měnit časy nebo vyučující, dokud
								jsou volná místa. Platí pravidlo „kdo dřív přijde". Ve <strong>3. kole</strong> si lze
								zapsat i předměty, které jsi nezaregistroval/a.
							</p>
						</div>
					</li>
				</ol>

				<div class="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>Pro prváky:</strong> Předměty prvního semestru ti přidělí fakulta automaticky — máš
						garantované místo. Pokud si ale v registracích změníš čas cvičení nebo předmět odhlásíš, tuto
						prioritu ztratíš a místo ti nikdo nezaručí. Změny rozvrhu nech raději až na fázi ručního zápisu.
					</p>
				</div>

				<div class="space-y-3">
					<a
						href="https://www.youtube.com/watch?v=lDpNfHLHCPA"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconYoutube class="h-6 w-6 shrink-0 text-red-500" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">Registrace a zápisy předmětů</div>
							<div class="text-sm text-(--insis-gray-500)">
								Videopříručky FIS – jak registrace probíhají, priority, ruční zápis
							</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- ── 4. Tool walkthrough ────────────────────────────── -->
			<section id="tool" class="mb-14" aria-labelledby="h-tool">
				<div class="mb-4 flex items-center gap-2">
					<IconCalendar class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-tool" class="text-2xl font-bold text-(--insis-gray-900)">
						4. Kreditožrouti – průvodce nástrojem
					</h2>
				</div>

				<p class="mb-6 text-(--insis-gray-700)">
					Kreditožrouti ti pomůže naplánovat rozvrh <em>před tím</em>, než se otevřou zápisy v InSISu.
					Nejde o přihlašovací systém — skutečný zápis vždy probíhá v InSISu.
				</p>

				<ol class="space-y-10">
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>1</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Vyber svoji fakultu</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Při prvním spuštění tě průvodce vyzve k výběru fakulty, na které studuješ nebo plánuješ
								studovat.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_step_1.png"
									alt="Krok 1 – výběr fakulty v průvodci Kreditožrouti"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Vyberte fakultu, na které studujete nebo plánujete studovat.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>2</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Vyber rok nástupu</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Zvol akademický rok, ve kterém jsi začal/a studovat. Pokud si nejsi jistý/á, zkontroluj
								e-index v InSISu nebo se podívej na akademický rok prvního zapsaného semestru.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_step_2.png"
									alt="Krok 2 – výběr roku nástupu"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Pokud nevíš, který rok vybrat, zkontroluj svůj e-index v InSISu.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>3</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Vyber studijní plán</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Filtruj podle úrovně studia (Bc./Mgr.) nebo vyhledej podle názvu. Klikni na svůj
								studijní plán. Pokud máš specializaci, vyber ji.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_step_3.png"
									alt="Krok 3 – výběr studijního plánu"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Každý studijní program má vlastní sadu povinných a volitelných předmětů.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>4</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Označ splněné předměty</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Odškrtni předměty, které jsi již úspěšně splnil/a — přestanou se ti zobrazovat v hlavním
								seznamu. Tento krok je volitelný, ale výrazně zpřehlední výběr.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_step_4_select.png"
									alt="Krok 4 – označení dokončených předmětů"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Označ předměty, které jsi již absolvoval/a — aplikace je skryje ze seznamu.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>5</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Prohlédni si seznam předmětů</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Zobrazí se ti předměty relevantní pro tvůj studijní plán s jejich rozvrhovou akcí, ECTS
								hodnotami a informacemi o vyučujícím. Kliknutím na řádek zobrazíš detail.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_courses.png"
									alt="Kreditožrouti – seznam předmětů"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Zvýrazněné předměty patří do tvého studijního plánu. Zelená = přidáno do rozvrhu.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>6</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Filtruj předměty</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								V levém panelu filtruj podle dne, jazyka, fakulty nebo kategorie předmětu. Filtry se kombinují.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_courses_filter.png"
									alt="Kreditožrouti – filtry předmětů"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Například: angličtina + pátek = předměty vyučované v angličtině v pátek.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>7</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Přepni na zobrazení rozvrhu</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Pohled rozvrhu zobrazuje tvůj týden jako mřížku. Kolize jsou zvýrazněny červeně.
								Zkontroluj, že nemáš vedle sebe předměty z různých areálů.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_courses_timetable.png"
									alt="Kreditožrouti – zobrazení rozvrhu"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Zkontroluj, že nemáš předměty z různých areálů hned po sobě bez přestávky.
								</figcaption>
							</figure>
						</div>
					</li>
				</ol>
			</section>

			<!-- ── 5. InSIS ───────────────────────────────────────── -->
			<section id="insis" class="mb-14" aria-labelledby="h-insis">
				<div class="mb-4 flex items-center gap-2">
					<IconInfo class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-insis" class="text-2xl font-bold text-(--insis-gray-900)">5. Zápis předmětů v InSISu</h2>
				</div>

				<p class="mb-6 text-(--insis-gray-700)">
					Jakmile máš rozvrh naplánovaný v Kreditožroutech, přesuň se do InSISu a zapiš si předměty
					oficiálně. Níže najdeš postup krok za krokem.
				</p>

				<ol class="space-y-10">
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>1</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Přihlas se a otevři Portál studenta</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Přejdi na
								<a href="https://insis.vse.cz" target="_blank" rel="noopener" class="text-(--insis-blue) underline"
									>insis.vse.cz</a
								>, přihlas se a klikni na <strong>Portál studenta</strong> v horní navigaci.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/insis_student_view.png"
									alt="InSIS – Portál studenta"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Portál studenta je rozcestník pro všechny studijní aplikace.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>2</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Otevři Registrace a zápisy</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								V sekci „Aplikace zvoleného studia" klikni na ikonu se třemi tlapkami —
								<strong>Registrace a zápisy</strong>.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/full_view_registration.png"
									alt="InSIS – arch registrací"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Arch předmětů – každý řádek je jeden předmět. Sloupec Stav ukazuje, zda je vše v pořádku.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>3</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Přidej předměty ze skupin</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Sjeď dolů na skupiny předmětů (oP, oV atd.), rozbal skupinu kliknutím na šipku, zaškrtni
								předměty a klikni na <strong>Přidat označené předměty</strong>.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/course_added_view.png"
									alt="InSIS – přidané předměty se stavovými tečkami"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Zelená tečka = předmět správně zaregistrován. Červená tečka = ještě jsi nezvolil/a čas výuky.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>4</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Vyber čas a vyučujícího</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								U každého předmětu s červenou tečkou klikni ve sloupci <strong>Rozvrh</strong> na odkaz
								<strong>Vyberte</strong>. Zvol čas přednášky i cvičení a potvrď tlačítkem
								<strong>Uložit</strong>.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/course_select_unit_slots.png"
									alt="InSIS – volba rozvrhové akce"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									Kapacita je zobrazena jako obsazeno/celkem. Zkontroluj areál, aby ses vyhnul/a problematickým přejezdům.
								</figcaption>
							</figure>
						</div>
					</li>

					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>5</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Zkontroluj finální rozvrh</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Klikni na <strong>Zobrazení rozvrhů</strong> pro přehled celého týdne. Ujisti se, že
								žádné dva předměty z různých areálů nejdou hned za sebou.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/timetable.png"
									alt="InSIS – zobrazení rozvrhu"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-500)">
									InSIS zobrazuje rozvrh jako týdenní mřížku. JM v místnosti = Jižní Město; RB/NB/SB = Žižkov.
								</figcaption>
							</figure>
						</div>
					</li>
				</ol>

				<div class="mt-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>Nezapomeň:</strong> Kreditožrouti je pouze plánovací nástroj. Dokud se nezapíšeš
						v InSISu, nemáš předměty úředně zapsané. Kreditožrouti nezapisuje předměty za tebe.
					</p>
				</div>

				<div class="mt-6 space-y-3">
					<a
						href="https://insis.vse.cz/help.pl?page=8968"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">InSIS nápověda: Registrace a zápis</div>
							<div class="text-sm text-(--insis-gray-500)">
								Podrobný popis všech funkcí aplikace Registrace a zápisy
							</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://ci.vse.cz/sluzby/dalsi/insis/jak-na-registrace-predmetu/"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">VŠE CI: Jak na registrace předmětů</div>
							<div class="text-sm text-(--insis-gray-500)">
								Praktický průvodce od VŠE IT centra — priority, penalizace, ruční zápis
							</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- ── 6. Links ───────────────────────────────────────── -->
			<section id="links" class="mb-14" aria-labelledby="h-links">
				<div class="mb-4 flex items-center gap-2">
					<IconLink class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-links" class="text-2xl font-bold text-(--insis-gray-900)">6. Užitečné odkazy</h2>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<a
						href="https://insis.vse.cz"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">InSIS</div>
							<div class="text-sm text-(--insis-gray-500)">Studijní informační systém VŠE</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://insis.vse.cz/help.pl?page=14728"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">Průvodce prváka po InSISu</div>
							<div class="text-sm text-(--insis-gray-500)">Officiální nápověda k prvnímu přihlášení</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://ci.vse.cz/sluzby/dalsi/insis/jak-na-registrace-predmetu/"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">Jak na registrace předmětů</div>
							<div class="text-sm text-(--insis-gray-500)">VŠE IT centrum – detailní průvodce zápisem</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://fmv.vse.cz/studenti/informace-pro-studenty/studijni-situace-a-jejich-reseni/kredity-registrace-a-zapis-predmetu/"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">FMV: Kredity, registrace a zápisy</div>
							<div class="text-sm text-(--insis-gray-500)">Průvodce pro studenty Fakulty mezinárodních vztahů</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://esnvseprague.cz/buddy-programme/"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">ESN Buddy Programme</div>
							<div class="text-sm text-(--insis-gray-500)">Propojení s českými studenty pro zahraniční studenty</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="/guide/Harmonogram_ZS_2026-2027_060526-1.pdf"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">Harmonogram ZS 2026/2027</div>
							<div class="text-sm text-(--insis-gray-500)">
								PDF – termíny registrací, zápisů a zkouškového období
							</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- CTA -->
			<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-6 text-center">
				<p class="mb-4 text-(--insis-gray-700)">Připraven/a naplánovat rozvrh?</p>
				<RouterLink to="/" class="insis-btn-primary inline-flex items-center gap-2">
					Otevřít Kreditožrouti
					<IconArrowRight class="h-4 w-4" aria-hidden="true" />
				</RouterLink>
			</div>
		</main>
	</div>
</template>
