<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { i18n } from '@client/i18n'

const route = useRoute('/legal/[slug]')
const router = useRouter()

watch(
	() => route.params.slug,
	slug => {
		router.replace(`/legal/${i18n.global.locale.value}/${slug}`)
	},
	{ immediate: true }
)
</script>

<template>
	<div />
</template>
