<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onClickOutside } from '@vueuse/core'
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
				'flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[3px] border border-solid py-[5px] pr-1.5 pl-2 text-xs font-medium sm:min-h-0',
				'transition-all duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[1px] focus-visible:outline-[var(--insis-blue)]',
				isOpen
					? 'border-[var(--insis-border-mid)] bg-[var(--insis-surface-2)] text-[var(--insis-text)]'
					: 'border-transparent bg-transparent text-[var(--insis-text-2)] hover:border-[var(--insis-border)] hover:bg-[var(--insis-surface-2)] hover:text-[var(--insis-text)]',
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
				class="absolute top-full right-0 z-50 mt-1 min-w-[90px] origin-top-right overflow-hidden rounded-[5px] border border-[var(--insis-border)] bg-[var(--insis-surface)] shadow-[var(--insis-shadow)]"
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
							? 'bg-[var(--insis-blue-subtle)] text-[var(--insis-blue)]'
							: 'text-[var(--insis-text)] hover:bg-[var(--insis-surface-2)]',
					]"
					@click="setLocale(l as string)"
				>
					<span>{{ (l as string).toUpperCase() }}</span>
					<span v-if="(locale as string) === (l as string)" class="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--insis-blue)]" />
				</button>
			</div>
		</Transition>
	</div>
</template>
