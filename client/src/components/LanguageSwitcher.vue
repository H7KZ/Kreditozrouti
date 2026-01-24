<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const localeNames: Record<string, string> = {
	cs: 'Čeština',
	en: 'English',
}

const toggleLocale = () => {
	locale.value = locale.value === 'cs' ? 'en' : 'cs'
	// Persist preference
	localStorage.setItem('locale', locale.value)
}
</script>

<template>
	<button class="insis-btn cursor-pointer flex items-center gap-2" @click="toggleLocale" :title="$t('nav.language')">
		<span class="text-sm">{{ localeNames[locale] }}</span>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
			/>
		</svg>
	</button>
</template>
