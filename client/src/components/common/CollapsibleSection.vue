<script setup lang="ts">
import { ref } from 'vue'
import IconChevronDown from '~icons/lucide/chevron-down'

interface Props {
	title: string
	defaultOpen?: boolean
	badge?: string | number
}

const props = withDefaults(defineProps<Props>(), {
	defaultOpen: true,
	badge: undefined,
})

const isOpen = ref(props.defaultOpen)

function toggle() {
	isOpen.value = !isOpen.value
}
</script>

<template>
	<button
		type="button"
		class="flex cursor-pointer w-full items-center justify-between py-1 px-1 -mx-1 rounded-[3px] text-left hover:bg-[var(--insis-surface-2)] transition-colors duration-100"
		:aria-expanded="isOpen"
		@click="toggle"
	>
		<span class="insis-label mb-0 flex items-center gap-1.5">
			{{ title }}
			<span v-if="badge !== undefined && badge !== ''" class="rounded-full bg-[var(--insis-blue)] px-1.5 py-0.5 text-[10px] text-white">
				{{ badge }}
			</span>
		</span>
		<IconChevronDown :class="['h-4 w-4 text-[var(--insis-gray-500)] transition-transform', { 'rotate-180': isOpen }]" aria-hidden="true" />
	</button>
	<div v-show="isOpen" class="mt-2">
		<slot />
	</div>
</template>
