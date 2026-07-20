<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AppHeader from '@client/components/common/AppHeader.vue'
import DocsSidebar from '@client/components/docs/DocsSidebar.vue'
import { useDocsNav } from '@client/composables/useDocsNav'

const { locale } = useI18n()
const route = useRoute()

const nav = useDocsNav(locale, () => route.path)
</script>

<template>
	<div class="flex min-h-screen flex-col bg-(--insis-bg)">
		<AppHeader />
		<div class="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6">
			<DocsSidebar :top-level="nav.topLevel" :sections="nav.sections" />
			<main
				class="prose prose-sm dark:prose-invert prose-headings:text-(--insis-text) prose-headings:font-semibold prose-p:text-(--insis-text-2) prose-a:text-(--insis-blue) prose-strong:text-(--insis-text) prose-code:text-(--insis-text) prose-li:text-(--insis-text-2) max-w-none flex-1"
			>
				<RouterView />
			</main>
		</div>
	</div>
</template>
