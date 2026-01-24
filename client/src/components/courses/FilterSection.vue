<script setup lang="ts">
import { computed, ref } from 'vue'

interface FilterItem {
	value: string
	label: string
	count?: number
}

interface Props {
	title: string
	items: FilterItem[]
	selected: string[]
	showCounts?: boolean
	collapsible?: boolean
	collapsedCount?: number
}

const props = withDefaults(defineProps<Props>(), {
	showCounts: false,
	collapsible: false,
	collapsedCount: 5,
})

const emit = defineEmits<{
	toggle: [value: string]
}>()

const isExpanded = ref(false)

const visibleItems = computed(() => {
	if (!props.collapsible || isExpanded.value) return props.items
	return props.items.slice(0, props.collapsedCount)
})

const hasMore = computed(() => props.collapsible && props.items.length > props.collapsedCount)
</script>

<template>
	<div class="filter-section mb-4">
		<label class="block text-xs font-medium text-[#6b7280] mb-1.5">
			{{ title }}
		</label>

		<div class="space-y-1">
			<label v-for="item in visibleItems" :key="item.value" class="flex items-center gap-2 cursor-pointer hover:text-[#4a7eb8] text-sm">
				<input
					type="checkbox"
					:checked="selected.includes(item.value)"
					class="rounded border-[#d1d5db] text-[#4a7eb8] focus:ring-[#4a7eb8] cursor-pointer"
					@change="emit('toggle', item.value)"
				/>
				<span class="flex-1 truncate">{{ item.label }}</span>
				<span v-if="showCounts && item.count !== undefined" class="text-xs text-[#9ca3af]"> ({{ item.count }}) </span>
			</label>
		</div>

		<button v-if="hasMore" class="text-xs text-[#4a7eb8] hover:underline mt-2 cursor-pointer" @click="isExpanded = !isExpanded">
			{{ isExpanded ? 'Zobrazit méně' : `Zobrazit více (${items.length - collapsedCount})` }}
		</button>
	</div>
</template>
