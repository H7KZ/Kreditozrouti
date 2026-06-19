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
	(locale) => {
		if (locale === 'cs') router.push('/about/cs')
	},
)

useSeoMeta({
	title: 'Build a conflict-free VŠE timetable in minutes – Kreditožrouti',
	description:
		'Plan your VŠE Prague timetable without the InSIS headache. Filter courses by day, time, and language, detect schedule conflicts instantly, and prepare for enrollment (zápisy) in advance. Free, no registration.',
	ogTitle: 'Kreditožrouti – VŠE Prague Timetable Planner',
	ogDescription: 'Visual timetable builder for VŠE Prague students. Filter courses, detect conflicts, plan enrollment. Free.',
})

useHead({
	link: [
		{ rel: 'alternate', hreflang: 'en', href: 'https://kreditozrouti.cz/about/en' },
		{ rel: 'alternate', hreflang: 'cs', href: 'https://kreditozrouti.cz/about/cs' },
		{ rel: 'alternate', hreflang: 'x-default', href: 'https://kreditozrouti.cz/about/cs' },
		{ rel: 'canonical', href: 'https://kreditozrouti.cz/about/en' },
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
						name: 'How do I build a conflict-free timetable at VŠE?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Kreditožrouti shows all courses from your study plan in one place. Click a time slot to add it to your timetable — the app instantly highlights any conflicts. Simply choose a different exercise or lecture session to resolve them.',
						},
					},
					{
						'@type': 'Question',
						name: 'How does VŠE course enrollment (zápisy) work?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Enrollment at VŠE happens in waves based on how many credits you have accumulated. Students with more credits get access earlier and can secure spots in popular time slots. Use Kreditožrouti to plan your full timetable in advance so you can enter it into InSIS the moment enrollment opens.',
						},
					},
					{
						'@type': 'Question',
						name: 'What are "kreditožrouti" (credit eaters)?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: '"Kreditožrouti" (literally "credit eaters") are notoriously difficult courses at VŠE that tend to consume students\' reserve credits — either through failed exams or general workload. The app is named after them as a nod to this shared student experience.',
						},
					},
					{
						'@type': 'Question',
						name: 'Does Kreditožrouti work for Erasmus and exchange students?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. Kreditožrouti is available in English and is designed to be accessible to students who are unfamiliar with the Czech credit system or the InSIS interface. Filter courses by language of instruction to find English-taught options.',
						},
					},
					{
						'@type': 'Question',
						name: 'Is Kreditožrouti free?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes, Kreditožrouti is completely free and requires no registration or login. Open kreditozrouti.cz, select your faculty and study plan, and start building your timetable immediately.',
						},
					},
					{
						'@type': 'Question',
						name: 'Which VŠE faculties are supported?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'All VŠE Prague faculties are supported: FIS, NF, FPH, FMV, FFÚ, FMJH, and others including exchange student programmes. Course data is regularly updated from InSIS.',
						},
					},
				],
			}),
		},
	],
})
</script>

<template>
	<div class="flex min-h-screen flex-col bg-(--insis-bg)">
		<AppHeader />

		<main class="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
			<!-- Hero -->
			<section class="mb-16 text-center">
				<h1 class="mb-4 text-3xl font-semibold text-(--insis-blue) sm:text-4xl">Build a conflict-free VŠE timetable in minutes</h1>
				<p class="mx-auto mb-8 max-w-2xl text-base text-(--insis-text-2)">
					Kreditožrouti replaces hours of tab-switching in InSIS. It shows all courses from your study plan in one place, detects conflicts
					automatically, and lets you build your timetable before enrollment opens.
				</p>
				<RouterLink to="/" class="insis-btn-primary px-6 py-2.5 text-sm">Launch the app →</RouterLink>
			</section>

			<!-- How it works -->
			<section class="mb-16">
				<h2 class="mb-8 text-xl font-semibold text-(--insis-blue)">How it works</h2>
				<ol class="grid gap-4 sm:grid-cols-2">
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">1</span>
						<div>
							<p class="font-medium text-(--insis-text)">Choose your faculty and study plan</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">
								A short wizard walks you through faculty, enrollment year, and field of study. Takes two minutes.
							</p>
						</div>
					</li>
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">2</span>
						<div>
							<p class="font-medium text-(--insis-text)">Filter courses</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">Filter by day, time, language of instruction, lecturer, or ECTS credits.</p>
						</div>
					</li>
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">3</span>
						<div>
							<p class="font-medium text-(--insis-text)">Build your timetable</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">Click time slots to add them — your timetable grid updates in real time.</p>
						</div>
					</li>
					<li class="flex gap-4 rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-sm font-semibold text-white">4</span>
						<div>
							<p class="font-medium text-(--insis-text)">Check for conflicts</p>
							<p class="mt-1 text-sm text-(--insis-text-2)">
								Overlaps are flagged instantly. Resolve them before enrollment — not while clicking through InSIS.
							</p>
						</div>
					</li>
				</ol>
			</section>

			<!-- Features -->
			<section class="mb-16">
				<h2 class="mb-8 text-xl font-semibold text-(--insis-blue)">Features</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconShieldCheck class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Conflict detection</h3>
						<p class="text-sm text-(--insis-text-2)">Overlapping time slots are flagged automatically. Nothing slips through.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconFilter class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Drag-to-filter</h3>
						<p class="text-sm text-(--insis-text-2)">Drag across the timetable grid to instantly hide courses outside your free hours.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconBookmark class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Saved schedules</h3>
						<p class="text-sm text-(--insis-text-2)">Your timetable saves automatically. Come back to it any time.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconGlobe class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Czech & English</h3>
						<p class="text-sm text-(--insis-text-2)">Full interface in both languages — ideal for Erasmus and exchange students.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconBuilding2 class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Faculty filter</h3>
						<p class="text-sm text-(--insis-text-2)">Show only your faculty's courses, or combine multiple study plans.</p>
					</div>
					<div class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-5">
						<IconCheckCircle2 class="mb-3 h-5 w-5 text-(--insis-blue)" />
						<h3 class="mb-1 font-medium text-(--insis-text)">Completed courses</h3>
						<p class="text-sm text-(--insis-text-2)">Mark courses you've already passed and filter them out of the list.</p>
					</div>
				</div>
			</section>

			<!-- FAQ -->
			<section class="mb-16">
				<h2 class="mb-8 text-xl font-semibold text-(--insis-blue)">Frequently asked questions</h2>
				<div class="space-y-6">
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">How do I build a conflict-free timetable at VŠE?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Kreditožrouti shows all courses from your study plan in one place. Click a time slot to add it to your timetable — the app instantly
							highlights any conflicts. Simply choose a different exercise or lecture session to resolve them.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">How does VŠE course enrollment (zápisy) work?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Enrollment at VŠE happens in waves based on how many credits you have accumulated. Students with more credits get access earlier and
							can secure spots in popular time slots. Use Kreditožrouti to plan your full timetable in advance so you can enter it into InSIS the
							moment enrollment opens.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">What are "kreditožrouti" (credit eaters)?</h3>
						<p class="text-sm text-(--insis-text-2)">
							"Kreditožrouti" (literally "credit eaters") are notoriously difficult courses at VŠE that tend to consume students' reserve credits
							— either through failed exams or general workload. The app is named after them as a nod to this shared student experience.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Does it work for Erasmus and exchange students?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Yes. Kreditožrouti is available in English and is designed to be accessible to students who are unfamiliar with the Czech credit
							system or the InSIS interface. Filter courses by language of instruction to find English-taught options.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Is Kreditožrouti free?</h3>
						<p class="text-sm text-(--insis-text-2)">
							Yes, Kreditožrouti is completely free and requires no registration or login. Open kreditozrouti.cz, select your faculty and study
							plan, and start building your timetable immediately.
						</p>
					</div>
					<div>
						<h3 class="mb-2 font-medium text-(--insis-text)">Which VŠE faculties are supported?</h3>
						<p class="text-sm text-(--insis-text-2)">
							All VŠE Prague faculties are supported: FIS, NF, FPH, FMV, FFÚ, FMJH, and others including exchange student programmes. Course data
							is regularly updated from InSIS.
						</p>
					</div>
				</div>
			</section>

			<!-- Bottom CTA -->
			<section class="rounded-lg border border-(--insis-border) bg-(--insis-surface) p-8 text-center">
				<h2 class="mb-3 text-xl font-semibold text-(--insis-blue)">Ready for enrollment?</h2>
				<p class="mb-6 text-sm text-(--insis-text-2)">No registration, no login. Just pick your study plan and start.</p>
				<RouterLink to="/" class="insis-btn-primary px-6 py-2.5 text-sm">Launch Kreditožrouti →</RouterLink>
			</section>
		</main>
	</div>
</template>
