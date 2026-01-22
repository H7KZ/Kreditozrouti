<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const route = useRoute()
const { t } = useI18n()

interface BreadcrumbItem {
	label: string
	to?: string
}

const breadcrumbs = computed((): BreadcrumbItem[] => {
	const items: BreadcrumbItem[] = [{ label: t('nav.home'), to: '/' }]

	if (route.name === 'courses') {
		items.push({ label: t('nav.courses') })
	} else if (route.name === 'course-detail') {
		items.push({ label: t('nav.courses'), to: '/courses' })
		items.push({ label: route.params.ident as string })
	} else if (route.name === 'wizard') {
		items.push({ label: t('wizard.title') })
	}

	return items
})
</script>

<template>
	<nav class="insis-breadcrumb" aria-label="Breadcrumb">
		<template v-for="(item, index) in breadcrumbs" :key="index">
			<RouterLink v-if="item.to && index < breadcrumbs.length - 1" :to="item.to">
				{{ item.label }}
			</RouterLink>
			<span v-else class="current">{{ item.label }}</span>
			<span v-if="index < breadcrumbs.length - 1" class="separator" aria-hidden="true"></span>
		</template>
	</nav>
</template>
