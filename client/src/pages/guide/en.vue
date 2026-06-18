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
		if (locale === 'cs') router.push('/guide/cs')
	},
)

useSeoMeta({
	title: 'International Student Guide – Kreditožrouti',
	description: 'A step-by-step guide for international VŠE Prague students: how InSIS works, the VŠE credit system, and how to use Kreditožrouti to plan your timetable.',
	ogTitle: 'International Student Guide – Kreditožrouti',
	ogDescription: 'Plan your VŠE Prague timetable. InSIS + credit system explained for international students.',
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
			<h1 class="mb-2 text-3xl font-bold text-(--insis-gray-900)">International Student Guide</h1>
			<p class="mb-10 text-(--insis-gray-500)">Everything you need to plan your VŠE Prague semester.</p>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconInfo class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">What is InSIS?</h2>
				</div>
				<p class="text-(--insis-gray-700)">
					InSIS is the information system of VŠE Prague. It is used for course registration (zápisy),
					viewing timetables, checking grades, and managing your study plan. The interface is primarily
					in Czech, which is why tools like Kreditožrouti exist.
				</p>
			</section>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconGraduationCap class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">The VŠE Credit System</h2>
				</div>
				<p class="mb-3 text-(--insis-gray-700)">
					VŠE uses the ECTS credit system. Each course is worth a certain number of credits,
					and you need to accumulate a required total to graduate.
				</p>
				<ul class="space-y-2 text-(--insis-gray-700)">
					<li class="flex items-start gap-2">
						<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<span><strong>Required courses</strong> are mandatory for your study programme.</span>
					</li>
					<li class="flex items-start gap-2">
						<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<span><strong>Elective courses</strong> let you choose from a wider pool to fill your credit quota.</span>
					</li>
					<li class="flex items-start gap-2">
						<IconArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-(--insis-blue)" aria-hidden="true" />
						<span><strong>Registration windows</strong> (zápisy) open on specific dates — plan your timetable before they open.</span>
					</li>
				</ul>
			</section>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconCalendar class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">How to use Kreditožrouti</h2>
				</div>
				<ol class="space-y-3 text-(--insis-gray-700)">
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">1</span>
						<span><strong>Select your study programme</strong> in the setup wizard so the app knows which courses are relevant to you.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">2</span>
						<span><strong>Filter courses</strong> by day, time, language, or faculty to narrow down your options.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">3</span>
						<span><strong>Add courses</strong> to your timetable and check for scheduling conflicts instantly.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">4</span>
						<span><strong>Resolve conflicts</strong> by swapping time slots until you have a clean schedule.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--insis-blue) text-xs font-bold text-white">5</span>
						<span><strong>Register in InSIS</strong> — Kreditožrouti is a planning tool only. Actual enrollment happens in InSIS.</span>
					</li>
				</ol>
			</section>

			<section class="mb-10">
				<div class="mb-3 flex items-center gap-2">
					<IconBookOpen class="h-5 w-5 text-(--insis-blue)" aria-hidden="true" />
					<h2 class="text-xl font-semibold text-(--insis-gray-900)">What Kreditožrouti does NOT do</h2>
				</div>
				<ul class="space-y-2 text-(--insis-gray-700)">
					<li class="flex items-start gap-2">
						<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-(--insis-gray-400)" aria-hidden="true"></span>
						<span>It does not register you for courses in InSIS — you must do that yourself.</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-(--insis-gray-400)" aria-hidden="true"></span>
						<span>It does not show real-time seat availability.</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-(--insis-gray-400)" aria-hidden="true"></span>
						<span>It does not submit grades or manage official study records.</span>
					</li>
				</ul>
			</section>

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
