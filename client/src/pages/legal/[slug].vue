<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { marked } from 'marked'
import LegalSidebar from '@client/components/legal/LegalSidebar.vue'

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
			<div class="bg-insis-gray-200 h-8 w-1/2 rounded-lg" />
			<div class="bg-insis-gray-200 h-4 w-full rounded" />
			<div class="bg-insis-gray-200 h-4 w-5/6 rounded" />
			<div class="bg-insis-gray-200 h-4 w-4/6 rounded" />
			<div class="bg-insis-gray-200 mt-6 h-5 w-1/3 rounded-lg" />
			<div class="bg-insis-gray-200 h-4 w-full rounded" />
			<div class="bg-insis-gray-200 h-4 w-3/4 rounded" />
		</div>

		<div v-else-if="notFound" class="py-20 text-center">
			<h1 class="text-insis-gray-800 text-2xl font-bold">Document not found</h1>
			<p class="text-insis-gray-600 mt-2">The requested document does not exist.</p>
			<RouterLink to="/" class="text-insis-blue mt-6 inline-block text-sm hover:underline">← Back to home</RouterLink>
		</div>

		<div v-else class="flex gap-10">
			<LegalSidebar :html="renderedHtml" class="hidden lg:block" />
			<article class="prose max-w-none min-w-0 flex-1" v-html="renderedHtml" />
		</div>
	</div>
</template>
