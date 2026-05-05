<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale, availableLocales } = useI18n()

function setLocale(newLocale: string) {
	locale.value = newLocale
	localStorage.setItem('locale', newLocale) // Persist selection
}
</script>

<template>
	<div class="flex items-center gap-0.5">
		<button
			v-for="l in availableLocales"
			:key="l"
			type="button"
			:class="[
				'cursor-pointer rounded-sm px-2 py-1 text-xs font-medium transition-colors',
				locale === l
					? 'bg-[var(--insis-blue)] text-white'
					: 'text-[var(--insis-text-3)] hover:bg-[var(--insis-surface-2)] hover:text-[var(--insis-text)]',
			]"
			@click="setLocale(l)"
		>
			{{ l.toUpperCase() }}
		</button>
	</div>
</template>
