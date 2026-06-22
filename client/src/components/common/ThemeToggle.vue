<script setup lang="ts">
import type { ColorScheme } from '@client/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@client/stores'
import IconMonitor from '~icons/lucide/monitor'
import IconMoon from '~icons/lucide/moon'
import IconSun from '~icons/lucide/sun'

const { t } = useI18n()
const uiStore = useUIStore()

const CYCLE: ColorScheme[] = ['system', 'dark', 'light']

function cycle() {
	const idx = CYCLE.indexOf(uiStore.colorScheme)
	uiStore.setColorScheme(CYCLE[(idx + 1) % CYCLE.length] as ColorScheme)
}

const icon = computed(() => {
	if (uiStore.colorScheme === 'dark') return IconMoon
	if (uiStore.colorScheme === 'light') return IconSun
	return IconMonitor
})

const label = computed(() => t(`theme.${uiStore.colorScheme}`))
</script>

<template>
	<button
		type="button"
		:aria-label="label"
		:title="label"
		class="flex min-h-[32px] min-w-[44px] cursor-pointer items-center justify-center rounded-[3px] border border-transparent p-[5px] text-(--insis-text-2) transition-all duration-100 hover:border-(--insis-border) hover:bg-(--insis-surface-2) hover:text-(--insis-text) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--insis-blue) sm:min-h-0 sm:min-w-0"
		@click="cycle"
	>
		<component :is="icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
	</button>
</template>
