<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useHead, useSeoMeta } from '@unhead/vue'
import { marked } from 'marked'
import AppHeader from '@client/components/common/AppHeader.vue'
import LegalSidebar from '@client/components/legal/LegalSidebar.vue'
import { i18n } from '@client/i18n'

const route = useRoute('/legal/[locale]/[slug]')
const router = useRouter()

const SUPPORTED_LOCALES = ['cs', 'en'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const allDocs = import.meta.glob('../../../legal/**/*.md', {
	query: '?raw',
	import: 'default'
}) as Record<string, () => Promise<string>>

marked.use({
	renderer: {
		heading(token) {
			const id = token.text
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-')
			return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>\n`
		}
	}
})

const renderedHtml = ref('')
const loading = ref(true)
const notFound = ref(false)

async function loadDoc() {
	loading.value = true
	notFound.value = false
	renderedHtml.value = ''

	const locale = route.params.locale as string
	const slug = route.params.slug as string

	if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
		notFound.value = true
		loading.value = false
		return
	}

	const localeKey = `../../../legal/${locale}/${slug}.md`
	const fallbackKey = `../../../legal/en/${slug}.md`
	const loader = allDocs[localeKey] ?? allDocs[fallbackKey]

	if (!loader) {
		notFound.value = true
		loading.value = false
		return
	}

	try {
		const raw = await loader()
		renderedHtml.value = await marked(raw)
	} catch {
		notFound.value = true
	} finally {
		loading.value = false
	}
}

watch([() => route.params.locale, () => route.params.slug], loadDoc, { immediate: true })

watch(
	() => i18n.global.locale.value,
	newLocale => {
		const slug = route.params.slug as string
		router.push(`/legal/${newLocale}/${slug}`)
	}
)

useSeoMeta({
	robots: 'index, follow'
})

useHead({
	link: [
		{
			rel: 'alternate',
			hreflang: 'cs',
			href: () => `https://kreditozrouti.cz/legal/cs/${route.params.slug}`
		},
		{
			rel: 'alternate',
			hreflang: 'en',
			href: () => `https://kreditozrouti.cz/legal/en/${route.params.slug}`
		},
		{
			rel: 'alternate',
			hreflang: 'x-default',
			href: () => `https://kreditozrouti.cz/legal/cs/${route.params.slug}`
		},
		{
			rel: 'canonical',
			href: () => `https://kreditozrouti.cz/legal/${route.params.locale}/${route.params.slug}`
		}
	]
})
</script>

<template>
	<div class="flex min-h-screen flex-col bg-(--insis-bg)">
		<AppHeader />
		<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
			<div v-if="loading" class="animate-pulse space-y-4 pt-2">
				<div class="h-8 w-1/2 rounded-lg bg-(--insis-gray-200)" />
				<div class="h-4 w-full rounded bg-(--insis-gray-200)" />
				<div class="h-4 w-5/6 rounded bg-(--insis-gray-200)" />
				<div class="h-4 w-4/6 rounded bg-(--insis-gray-200)" />
				<div class="mt-6 h-5 w-1/3 rounded-lg bg-(--insis-gray-200)" />
				<div class="h-4 w-full rounded bg-(--insis-gray-200)" />
				<div class="h-4 w-3/4 rounded bg-(--insis-gray-200)" />
			</div>

			<div v-else-if="notFound" class="py-20 text-center">
				<h1 class="text-2xl font-bold text-(--insis-gray-800)">Document not found</h1>
				<p class="mt-2 text-(--insis-gray-600)">The requested document does not exist.</p>
				<RouterLink to="/" class="mt-6 inline-block text-sm text-(--insis-blue) hover:underline">← Back to home</RouterLink>
			</div>

			<div v-else class="flex gap-10">
				<LegalSidebar :html="renderedHtml" class="hidden lg:block" />
				<article class="prose max-w-none min-w-0 flex-1" v-html="renderedHtml" />
			</div>
		</main>
	</div>
</template>
