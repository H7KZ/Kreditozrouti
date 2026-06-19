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
		if (locale === 'cs') router.push('/guide/cs')
	},
)

useSeoMeta({
	title: 'International Student Guide – Kreditožrouti',
	description:
		'Complete guide for VŠE Prague students: credit system, grading, course types, InSIS registration walkthrough, and how to use Kreditožrouti to plan your timetable.',
	ogTitle: 'International Student Guide – Kreditožrouti',
	ogDescription: 'VŠE Prague credit system, InSIS registration and Kreditožrouti explained step-by-step for international students.',
})

useHead({
	link: [
		{ rel: 'alternate', hreflang: 'en', href: 'https://kreditozrouti.cz/guide/en' },
		{ rel: 'alternate', hreflang: 'cs', href: 'https://kreditozrouti.cz/guide/cs' },
		{ rel: 'alternate', hreflang: 'x-default', href: 'https://kreditozrouti.cz/guide/en' },
		{ rel: 'canonical', href: 'https://kreditozrouti.cz/guide/en' },
	],
})
</script>

<template>
	<div class="min-h-screen bg-(--insis-bg)" lang="en">
		<AppHeader />

		<main id="main-content" class="mx-auto max-w-4xl px-4 py-10">
			<h1 class="mb-2 text-3xl font-bold text-(--insis-gray-900)">Student Guide</h1>
			<p class="mb-8 text-(--insis-gray-500)">
				Everything you need to know to get started at VŠE Prague — credits, campus, enrollment, and how to plan your timetable with Kreditožrouti.
			</p>

			<!-- TOC -->
			<nav class="mb-12 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5" aria-label="Guide contents">
				<p class="mb-3 font-semibold text-(--insis-gray-900)">In this guide</p>
				<ol class="space-y-1 text-sm">
					<li><a href="#credits" class="text-(--insis-blue) hover:underline">1. The VŠE Credit System</a></li>
					<li><a href="#campus" class="text-(--insis-blue) hover:underline">2. Campus Locations</a></li>
					<li><a href="#enrollment" class="text-(--insis-blue) hover:underline">3. Registration &amp; Enrollment</a></li>
					<li><a href="#tool" class="text-(--insis-blue) hover:underline">4. Kreditožrouti Walkthrough</a></li>
					<li><a href="#insis" class="text-(--insis-blue) hover:underline">5. Registering Courses in InSIS</a></li>
					<li><a href="#links" class="text-(--insis-blue) hover:underline">6. Useful Links</a></li>
				</ol>
			</nav>

			<!-- ── 1. Credits ─────────────────────────────────────── -->
			<section id="credits" class="mb-14" aria-labelledby="h-credits">
				<div class="mb-4 flex items-center gap-2">
					<IconGraduationCap class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-credits" class="text-2xl font-bold text-(--insis-gray-900)">1. The VŠE Credit System</h2>
				</div>

				<p class="mb-4 text-(--insis-gray-700)">
					VŠE uses the ECTS credit system, recognised across European universities. When you enrol in a bachelor's programme you receive
					<strong>216 credit vouchers</strong> (kreditové poukázky). Each course costs vouchers equal to its credit value. Pass the course and the
					same number of credits is added to your account. You need <strong>180 earned credits</strong> distributed across the required categories to
					graduate.
				</p>

				<div class="mb-6 flex gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4">
					<IconInfo class="mt-0.5 h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
					<p class="text-sm text-(--insis-gray-700)">
						<strong>20-credit-per-semester rule:</strong> by the end of each semester your cumulative earned credits must equal at least
						<code class="rounded bg-(--insis-border) px-1">semester number × 20</code>. Fall behind and the shortfall is deducted from your
						remaining vouchers as a penalty.
					</p>
				</div>

				<h3 class="mb-3 font-semibold text-(--insis-gray-900)">Course categories</h3>
				<div class="mb-6 overflow-x-auto rounded-lg border border-(--insis-border)">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-(--insis-surface) text-left text-(--insis-gray-500)">
								<th class="px-4 py-2 font-medium">Code</th>
								<th class="px-4 py-2 font-medium">Type</th>
								<th class="px-4 py-2 font-medium">What it means</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-(--insis-border) text-(--insis-gray-700)">
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">oP</td>
								<td class="px-4 py-2">Mandatory</td>
								<td class="px-4 py-2">You must complete every course on the list.</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">oV</td>
								<td class="px-4 py-2">Programme elective</td>
								<td class="px-4 py-2">Pick from a pool until you reach the required number of credits for this group.</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">oJ1</td>
								<td class="px-4 py-2">Language — 1st language</td>
								<td class="px-4 py-2">At FIS this is English — 12 credits total (4 courses × 3 cr). Varies by faculty.</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">TV</td>
								<td class="px-4 py-2">Physical Education</td>
								<td class="px-4 py-2">0 credits, costs 0 vouchers. You must complete 2 semesters during your bachelor's.</td>
							</tr>
							<tr>
								<td class="px-4 py-2 font-mono font-semibold">cVB</td>
								<td class="px-4 py-2">Free elective</td>
								<td class="px-4 py-2">Does not count toward your degree — taken on top of your required credits.</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mb-3 font-semibold text-(--insis-gray-900)">Grading</h3>
				<div class="mb-4 overflow-x-auto rounded-lg border border-(--insis-border)">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-(--insis-surface) text-left text-(--insis-gray-500)">
								<th class="px-4 py-2 font-medium">Points</th>
								<th class="px-4 py-2 font-medium">Grade</th>
								<th class="px-4 py-2 font-medium">Note</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-(--insis-border) text-(--insis-gray-700)">
							<tr>
								<td class="px-4 py-2">90–100</td>
								<td class="px-4 py-2 font-semibold">1 (A)</td>
								<td class="px-4 py-2">—</td>
							</tr>
							<tr>
								<td class="px-4 py-2">75–89</td>
								<td class="px-4 py-2 font-semibold">2 (B/C)</td>
								<td class="px-4 py-2">—</td>
							</tr>
							<tr>
								<td class="px-4 py-2">60–74</td>
								<td class="px-4 py-2 font-semibold">3 (D/E)</td>
								<td class="px-4 py-2">—</td>
							</tr>
							<tr>
								<td class="px-4 py-2">50–59</td>
								<td class="px-4 py-2 font-semibold">4+ (F+)</td>
								<td class="px-4 py-2">One resit allowed in the same exam period</td>
							</tr>
							<tr>
								<td class="px-4 py-2">0–49</td>
								<td class="px-4 py-2 font-semibold">4 (F)</td>
								<td class="px-4 py-2">Fail — no resit</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>VŠE special: grade 4+</strong> — if you score 50–59 points you receive 4+ and get one more attempt at the final exam or test
						within the same exam period. If the resit pushes you to 60+, the 4+ is erased and you pass. If not (or if you skip the resit), you
						receive 4.
					</p>
				</div>

				<h3 class="mb-3 font-semibold text-(--insis-gray-900)">Video resources</h3>
				<div class="space-y-3">
					<a
						href="https://www.youtube.com/watch?v=7AZ9Txwfgb8"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconYoutube class="h-6 w-6 shrink-0 text-red-500" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">The VŠE Credit System (Czech)</div>
							<div class="text-sm text-(--insis-gray-600)">FIS Videopříručky – vouchers, 180 credits and earning your degree</div>
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
							<div class="font-medium text-(--insis-gray-900)">Courses &amp; Study Plans (Czech)</div>
							<div class="text-sm text-(--insis-gray-600)">FIS Videopříručky – mandatory, elective, language courses and PE</div>
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
							<div class="font-medium text-(--insis-gray-900)">Course Grading (Czech)</div>
							<div class="text-sm text-(--insis-gray-600)">FIS Videopříručky – point system, grades, 4+ resit mechanic</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- ── 2. Campus ──────────────────────────────────────── -->
			<section id="campus" class="mb-14" aria-labelledby="h-campus">
				<div class="mb-4 flex items-center gap-2">
					<IconMapPin class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-campus" class="text-2xl font-bold text-(--insis-gray-900)">2. Campus Locations</h2>
				</div>

				<p class="mb-4 text-(--insis-gray-700)">VŠE teaching takes place on two separate campuses in Prague:</p>

				<div class="mb-4 grid gap-4 sm:grid-cols-2">
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4">
						<p class="mb-1 font-semibold text-(--insis-gray-900)">Žižkov (main campus)</p>
						<p class="text-sm text-(--insis-gray-600)">Náměstí W. Churchilla, Prague 3</p>
						<p class="mt-2 text-sm text-(--insis-gray-700)">
							Room codes start with:
							<span class="font-mono font-semibold">RB, NB, SB, IB</span>
						</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4">
						<p class="mb-1 font-semibold text-(--insis-gray-900)">Jižní Město (South City)</p>
						<p class="text-sm text-(--insis-gray-600)">Jižní Město, Prague 4</p>
						<p class="mt-2 text-sm text-(--insis-gray-700)">
							Room codes start with:
							<span class="font-mono font-semibold">JM</span>
						</p>
					</div>
				</div>

				<div class="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>Watch out for commuting time!</strong> Getting between Žižkov and Jižní Město takes about <strong>45 minutes</strong> by public
						transport. Never schedule classes on different campuses back-to-back — you will not make it in 15 minutes.
					</p>
				</div>
			</section>

			<!-- ── 3. Enrollment ──────────────────────────────────── -->
			<section id="enrollment" class="mb-14" aria-labelledby="h-enrollment">
				<div class="mb-4 flex items-center gap-2">
					<IconClock class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-enrollment" class="text-2xl font-bold text-(--insis-gray-900)">3. Registration &amp; Enrollment</h2>
				</div>

				<p class="mb-6 text-(--insis-gray-700)">
					Courses are not enrolled in a single step — there are two separate phases before each semester begins. Exact dates are published in the
					academic calendar on the VŠE website.
				</p>

				<ol class="mb-6 space-y-6">
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>1</span
						>
						<div>
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Registrace (Registration)</h3>
							<p class="text-(--insis-gray-700)">
								You express interest in courses and pick your preferred lecture and seminar time slots. Over-subscription is allowed at this
								stage — the system resolves conflicts later.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Automatický zápis (Automated enrollment — 3 rounds)</h3>
							<p class="mb-2 text-(--insis-gray-700)">The system allocates seats based on priority rules. If demand exceeds capacity:</p>
							<ul class="space-y-1 text-sm text-(--insis-gray-700)">
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>Faculty-pre-registered students (first-years) have top priority</span>
								</li>
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>More earned credits → higher priority</span>
								</li>
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>Fewer lost vouchers → higher priority</span>
								</li>
								<li class="flex items-start gap-2">
									<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
									<span>Ties → random number generator</span>
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Ruční zápis (Manual enrollment)</h3>
							<p class="text-(--insis-gray-700)">
								After automated enrollment you can manually adjust your timetable — swap time slots or instructors while seats remain available.
								First-come, first-served. In
								<strong>round 3</strong> you can also add courses you never registered for.
							</p>
						</div>
					</li>
				</ol>

				<div class="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>First-years:</strong> Your first-semester timetable is pre-assigned by the faculty — you have a guaranteed seat. If you change a
						pre-assigned seminar time or drop the course during the registration phase, you lose that guarantee. Make timetable changes during the
						manual enrollment phase instead.
					</p>
				</div>

				<div class="mb-6 flex gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4">
					<IconInfo class="mt-0.5 h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
					<p class="text-sm text-(--insis-gray-700)">
						<strong>First-year exception:</strong> In semester 1 your mandatory courses are already enrolled. You only need to self-register PE and
						language courses — see the InSIS walkthrough below.
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
							<div class="font-medium text-(--insis-gray-900)">Course Registration &amp; Enrollment (Czech)</div>
							<div class="text-sm text-(--insis-gray-600)">FIS Videopříručky – how registration works, priorities, manual enrollment</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- ── 4. Tool walkthrough ────────────────────────────── -->
			<section id="tool" class="mb-14" aria-labelledby="h-tool">
				<div class="mb-4 flex items-center gap-2">
					<IconCalendar class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-tool" class="text-2xl font-bold text-(--insis-gray-900)">4. Kreditožrouti Walkthrough</h2>
				</div>

				<p class="mb-6 text-(--insis-gray-700)">
					Kreditožrouti helps you plan your timetable <em>before</em> enrollment opens in InSIS. It is a planning tool only — it does not register you
					for courses. Actual enrollment happens in InSIS.
				</p>

				<ol class="space-y-10">
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>1</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Select your faculty</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								On first launch the setup wizard asks you to choose the faculty you study or plan to study at.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img
									src="/guide/kreditozrouti_step_1.png"
									alt="Step 1 – select faculty in Kreditožrouti setup wizard"
									class="w-full"
									loading="lazy"
								/>
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Choose the faculty you are enrolled in or planning to join.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Select your entry year</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Pick the academic year you started studying. If unsure, check your e-index in InSIS or look at the academic year of your first
								enrolled semester.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/kreditozrouti_step_2.png" alt="Step 2 – select entry year" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Not sure which year? Check your e-index in InSIS.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Select your study plan</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Filter by study level (Bachelor's / Master's) or search by name, then click your plan. If your programme has a specialisation,
								select it here.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/kreditozrouti_step_3.png" alt="Step 3 – select study plan" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Each programme has its own set of mandatory and elective courses.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Mark completed courses</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Check off courses you have already passed — they will be hidden from the main list so you can focus on what's left. This step is
								optional but greatly improves clarity.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/kreditozrouti_step_4_select.png" alt="Step 4 – mark completed courses" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Tick the courses you have already completed — the app will hide them from the list.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Browse the course list</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Courses relevant to your study plan appear with their time slots, ECTS values and instructor. Click any row to see course
								details.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/kreditozrouti_courses.png" alt="Kreditožrouti – course list" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Highlighted rows belong to your study plan. Green = already added to your timetable.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Filter courses</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Use the left sidebar to filter by day, language, faculty or course category. Filters stack — for example: English + Friday =
								English-taught courses on Fridays.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/kreditozrouti_courses_filter.png" alt="Kreditožrouti – course filters" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Filters combine — e.g. language: English + day: Friday shows only English courses on Fridays.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Switch to timetable view</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								The timetable view shows your week as a grid. Conflicts are highlighted in red. Check that no two consecutive classes are on
								different campuses.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/kreditozrouti_courses_timetable.png" alt="Kreditožrouti – timetable view" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Check that no back-to-back classes span different campuses without a gap.
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
					<h2 id="h-insis" class="text-2xl font-bold text-(--insis-gray-900)">5. Registering Courses in InSIS</h2>
				</div>

				<p class="mb-6 text-(--insis-gray-700)">
					Once your timetable is planned in Kreditožrouti, head to InSIS to officially enrol. InSIS's interface is in Czech — the captions below
					explain the key labels.
				</p>

				<ol class="space-y-10">
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-bold text-white"
							aria-hidden="true"
							>1</span
						>
						<div class="flex-1">
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Log in and open Portál studenta</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Go to
								<a href="https://insis.vse.cz" target="_blank" rel="noopener" class="text-(--insis-blue) underline">insis.vse.cz</a>, sign in
								with your VŠE credentials, then click <strong>Portál studenta</strong>
								(= Student Portal) in the top navigation.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/insis_student_view.png" alt="InSIS – Student Portal home" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									<strong>Portál studenta</strong> = Student Portal. All study applications are accessible from here.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Open Registrace a zápisy</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								In the "Aplikace zvoleného studia" section find the three-paw icon and click
								<strong>Registrace a zápisy</strong> (= Course Registration &amp; Enrollment).
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/full_view_registration.png" alt="InSIS – registration sheet" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									<strong>Arch</strong> = enrollment sheet. Each row is one course. <strong>Stav</strong> = status (green dot = OK, red dot =
									time slot missing).
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Add courses from course groups</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Scroll down to the course groups (oP, oV, etc.), expand a group with the arrow, tick the courses you want, then click
								<strong>Přidat označené předměty</strong> (= Add selected courses).
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/course_added_view.png" alt="InSIS – courses added with status dots" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									Green dot = registered correctly. Red dot = you still need to pick a time slot.
									<strong>Přidat označené předměty</strong> = Add selected courses.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Pick a time slot and instructor</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								For each course with a red dot, click <strong>Vyberte</strong> (= Select) in the <strong>Rozvrh</strong> (= Timetable) column.
								Choose lecture and seminar times, then confirm with <strong>Uložit</strong> (= Save).
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/course_select_unit_slots.png" alt="InSIS – choosing a time slot" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									<strong>Kapacita</strong> = Capacity (enrolled / total). <strong>Vyberte</strong> = Select. <strong>Uložit</strong> = Save.
									Check the room code — <strong>JM</strong> = Jižní Město, <strong>RB/NB/SB</strong> = Žižkov.
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
							<h3 class="mb-1 font-semibold text-(--insis-gray-900)">Check your final timetable</h3>
							<p class="mb-3 text-(--insis-gray-700)">
								Click <strong>Zobrazení rozvrhů</strong> (= View timetable) to see your full week. Verify no two back-to-back classes are on
								different campuses.
							</p>
							<figure class="overflow-hidden rounded-lg border border-(--insis-border)">
								<img src="/guide/timetable.png" alt="InSIS – weekly timetable view" class="w-full" loading="lazy" />
								<figcaption class="bg-(--insis-surface) px-4 py-2 text-sm text-(--insis-gray-600)">
									<strong>Zobrazení rozvrhů</strong> = View timetable. Room codes: <strong>JM…</strong> = Jižní Město campus;
									<strong>RB/NB/SB/IB</strong> = Žižkov campus.
								</figcaption>
							</figure>
						</div>
					</li>
				</ol>

				<div class="mt-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
					<IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
					<p class="text-sm text-amber-800">
						<strong>Remember:</strong> Kreditožrouti is a planning tool only. Until you complete enrollment in InSIS, you are not officially
						registered for any courses. Kreditožrouti does not enrol you.
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
							<div class="font-medium text-(--insis-gray-900)">InSIS Help: Registration &amp; Enrollment</div>
							<div class="text-sm text-(--insis-gray-600)">Official documentation for the Registrace a zápisy application (Czech)</div>
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
							<div class="font-medium text-(--insis-gray-900)">VŠE IT Centre: Course Registration Guide</div>
							<div class="text-sm text-(--insis-gray-600)">Practical guide from VŠE IT — priorities, penalties, manual enrollment (Czech)</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- ── 6. Links ───────────────────────────────────────── -->
			<section id="links" class="mb-14" aria-labelledby="h-links">
				<div class="mb-4 flex items-center gap-2">
					<IconLink class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 id="h-links" class="text-2xl font-bold text-(--insis-gray-900)">6. Useful Links</h2>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<a
						href="https://exchange.vse.cz/for-students/"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">VŠE Exchange Office — For Students</div>
							<div class="text-sm text-(--insis-gray-600)">Everything incoming exchange students need: application, visa, dorms, orientation</div>
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
							<div class="font-medium text-(--insis-gray-900)">ESN VSE Prague – Buddy Programme</div>
							<div class="text-sm text-(--insis-gray-600)">Get matched with a Czech student who can help you settle in</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
					<a
						href="https://insis.vse.cz"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-4 transition-colors hover:border-(--insis-blue)"
					>
						<IconLink class="h-5 w-5 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<div class="flex-1">
							<div class="font-medium text-(--insis-gray-900)">InSIS</div>
							<div class="text-sm text-(--insis-gray-600)">VŠE student information system</div>
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
							<div class="font-medium text-(--insis-gray-900)">First-Year InSIS Guide</div>
							<div class="text-sm text-(--insis-gray-600)">Official InSIS help for new students (Czech)</div>
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
							<div class="font-medium text-(--insis-gray-900)">VŠE IT Centre: Course Registration</div>
							<div class="text-sm text-(--insis-gray-600)">Practical registration guide (Czech)</div>
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
							<div class="font-medium text-(--insis-gray-900)">Academic Calendar ZS 2026/2027 (PDF)</div>
							<div class="text-sm text-(--insis-gray-600)">Registration, enrollment and exam period dates</div>
						</div>
						<IconExternalLink class="h-4 w-4 shrink-0 text-(--insis-gray-400)" aria-hidden="true" />
					</a>
				</div>
			</section>

			<!-- CTA -->
			<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-6 text-center">
				<p class="mb-4 text-(--insis-gray-700)">Ready to plan your timetable?</p>
				<RouterLink to="/" class="insis-btn-primary inline-flex items-center gap-2">
					Open Kreditožrouti
					<IconArrowRight class="h-4 w-4" aria-hidden="true" />
				</RouterLink>
			</div>
		</main>
	</div>
</template>
