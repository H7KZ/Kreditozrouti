<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onClickOutside } from '@vueuse/core'
import analytics from '@client/analytics'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconGlobe from '~icons/lucide/globe'

const { locale, availableLocales } = useI18n()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

onClickOutside(containerRef, () => {
	isOpen.value = false
})

function setLocale(newLocale: string) {
	locale.value = newLocale
	localStorage.setItem('locale', newLocale) // Persist selection
	analytics.track('language_changed', { language: newLocale })
	isOpen.value = false
}

function toggle() {
	isOpen.value = !isOpen.value
}
</script>

<template>
	<div ref="containerRef" class="relative">
		<!-- Trigger button -->
		<button
			type="button"
			:class="[
				'flex h-7 cursor-pointer items-center gap-1.5 rounded-[3px] border border-solid py-[5px] pr-1.5 pl-2 text-xs font-medium sm:min-h-0',
				'transition-all duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--insis-blue)',
				isOpen
					? 'border-(--insis-border-mid) bg-(--insis-surface-2) text-(--insis-text)'
					: 'border-transparent bg-transparent text-(--insis-text-2) hover:border-(--insis-border) hover:bg-(--insis-surface-2) hover:text-(--insis-text)'
			]"
			:aria-expanded="isOpen"
			:aria-label="$t('common.switchLanguage')"
			aria-haspopup="listbox"
			@click="toggle"
		>
			<IconGlobe class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
			<span>{{ (locale as string).toUpperCase() }}</span>
			<IconChevronDown :class="['h-3 w-3 shrink-0 transition-transform duration-150', isOpen && 'rotate-180']" aria-hidden="true" />
		</button>

		<!-- Dropdown panel -->
		<Transition
			enter-active-class="transition-all duration-100 ease-out"
			enter-from-class="opacity-0 -translate-y-1 scale-[0.96]"
			enter-to-class="opacity-100 translate-y-0 scale-100"
			leave-active-class="transition-all duration-75 ease-in"
			leave-from-class="opacity-100 translate-y-0 scale-100"
			leave-to-class="opacity-0 -translate-y-1 scale-[0.96]"
		>
			<div
				v-if="isOpen"
				class="absolute top-full right-0 z-50 mt-1 min-w-[90px] origin-top-right overflow-hidden rounded-[5px] border border-(--insis-border) bg-(--insis-surface) shadow-(--insis-shadow)"
				role="listbox"
			>
				<button
					v-for="l in availableLocales"
					:key="l"
					type="button"
					role="option"
					:aria-selected="(locale as string) === (l as string)"
					:class="[
						'flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition-colors duration-75',
						(locale as string) === (l as string)
							? 'bg-(--insis-blue-subtle) text-(--insis-blue)'
							: 'text-(--insis-text) hover:bg-(--insis-surface-2)'
					]"
					@click="setLocale(l as string)"
				>
					<span>{{ (l as string).toUpperCase() }}</span>
					<span v-if="(locale as string) === (l as string)" class="h-[7px] w-[7px] shrink-0 rounded-full bg-(--insis-blue)" />
				</button>
			</div>
		</Transition>
	</div>
</template>
