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
				'flex items-center gap-1.5 cursor-pointer rounded-[3px] pl-2 pr-1.5 py-[5px] text-xs font-medium border border-solid',
				'transition-all duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--insis-blue)] focus-visible:outline-offset-[1px]',
				isOpen
					? 'bg-[var(--insis-surface-2)] border-[var(--insis-border-mid)] text-[var(--insis-text)]'
					: 'bg-transparent border-transparent text-[var(--insis-text-2)] hover:bg-[var(--insis-surface-2)] hover:border-[var(--insis-border)] hover:text-[var(--insis-text)]',
			]"
			:aria-expanded="isOpen"
			aria-haspopup="listbox"
			@click="toggle"
		>
			<IconGlobe class="h-3.5 w-3.5 shrink-0" />
			<span>{{ (locale as string).toUpperCase() }}</span>
			<IconChevronDown :class="['h-3 w-3 transition-transform duration-150 shrink-0', isOpen && 'rotate-180']" />
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
				class="absolute right-0 top-full mt-1 z-50 min-w-[90px] rounded-[5px] border border-[var(--insis-border)] bg-[var(--insis-surface)] shadow-[var(--insis-shadow)] overflow-hidden origin-top-right"
				role="listbox"
			>
				<button
					v-for="l in availableLocales"
					:key="l"
					type="button"
					role="option"
					:aria-selected="(locale as string) === (l as string)"
					:class="[
						'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors duration-75',
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
