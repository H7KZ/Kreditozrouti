<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { i18n } from '@client/i18n'

const router = useRouter()

watch(
	() => i18n.global.locale.value,
	(locale) => {
		router.replace(locale === 'en' ? '/about/en' : '/about/cs')
	},
	{ immediate: true },
)
</script>

<template>
	<div />
</template>
