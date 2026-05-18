<script setup lang="ts">
import LegalSidebar from '@client/components/legal/LegalSidebar.vue'
import { marked } from 'marked'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const { locale } = useI18n()

const allDocs = import.meta.glob('../../legal/**/*.md', {
	query: '?raw',
	import: 'default',
}) as Record<string, () => Promise<string>>

marked.use({
	renderer: {
		heading(token) {
			const id = token.text
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-')
			return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>\n`
		},
	},
})

const renderedHtml = ref('')
const loading = ref(true)
const notFound = ref(false)

async function loadDoc() {
	loading.value = true
	notFound.value = false
	renderedHtml.value = ''

	const slug = route.params.slug as string
	const localeKey = `../../legal/${locale.value}/${slug}.md`
	const fallbackKey = `../../legal/en/${slug}.md`
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

watch([() => route.params.slug, locale], loadDoc, { immediate: true })
</script>

<template>
	<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
		<div v-if="loading" class="animate-pulse space-y-4 pt-2">
			<div class="h-8 w-1/2 rounded-lg bg-insis-gray-200" />
			<div class="h-4 w-full rounded bg-insis-gray-200" />
			<div class="h-4 w-5/6 rounded bg-insis-gray-200" />
			<div class="h-4 w-4/6 rounded bg-insis-gray-200" />
			<div class="mt-6 h-5 w-1/3 rounded-lg bg-insis-gray-200" />
			<div class="h-4 w-full rounded bg-insis-gray-200" />
			<div class="h-4 w-3/4 rounded bg-insis-gray-200" />
		</div>

		<div v-else-if="notFound" class="py-20 text-center">
			<h1 class="text-2xl font-bold text-insis-gray-800">Document not found</h1>
			<p class="mt-2 text-insis-gray-600">The requested document does not exist.</p>
			<RouterLink to="/" class="mt-6 inline-block text-sm text-insis-blue hover:underline">← Back to home</RouterLink>
		</div>

		<div v-else class="flex gap-10">
			<LegalSidebar :html="renderedHtml" class="hidden lg:block" />
			<article class="prose min-w-0 max-w-none flex-1" v-html="renderedHtml" />
		</div>
	</div>
</template>
