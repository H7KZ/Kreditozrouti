<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconGlobe from '~icons/lucide/globe'

const { locale, availableLocales } = useI18n()
const isOpen = ref(false)

// Display names for your supported locales
const localeNames: Record<string, string> = {
	cs: 'Čeština',
	en: 'English',
}

const currentLocale = computed(() => locale.value)

function toggleDropdown() {
	isOpen.value = !isOpen.value
}

function setLocale(newLocale: string) {
	locale.value = newLocale
	localStorage.setItem('locale', newLocale) // Persist selection
	isOpen.value = false
}
</script>

<template>
	<div class="relative">
		<button type="button" class="insis-btn insis-btn-secondary flex items-center gap-2" @click="toggleDropdown">
			<IconGlobe class="h-4 w-4 text-[var(--insis-gray-500)]" />
			<span class="text-sm uppercase">{{ currentLocale }}</span>
			<IconChevronDown class="h-3 w-3 text-[var(--insis-gray-500)] transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
		</button>

		<div v-if="isOpen" class="fixed inset-0 z-40 cursor-default" @click="isOpen = false" />

		<div
			v-if="isOpen"
			class="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-sm border border-[var(--insis-border)] bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
		>
			<button
				v-for="l in availableLocales"
				:key="l"
				type="button"
				class="block cursor-pointer w-full px-4 py-2 text-left text-sm hover:bg-[var(--insis-row-hover)]"
				:class="[locale === l ? 'font-medium text-[var(--insis-blue)] bg-[var(--insis-bg)]' : 'text-[var(--insis-gray-700)]']"
				@click="setLocale(l)"
			>
				{{ localeNames[l] ?? l }}
			</button>
		</div>
	</div>
</template>
