<script setup lang="ts">
/**
 * FilterCheckboxGroup
 * Reusable checkbox group for facet filtering.
 * Supports collapsible list and optional search.
 */
import { computed, ref } from 'vue'

import FacetItem from '@api/Interfaces/FacetItem.ts'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconSearch from '~icons/lucide/search'

interface Props {
	label: string
	facets: FacetItem[]
	selected: string[]
	searchable?: boolean
	maxVisible?: number
}

interface Emits {
	(e: 'update:selected', values: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
	searchable: false,
	maxVisible: 5,
})

const emit = defineEmits<Emits>()

const expanded = ref(false)
const searchQuery = ref('')

// Filter facets by search query
const filteredFacets = computed(() => {
	if (!searchQuery.value.trim()) return props.facets

	const query = searchQuery.value.toLowerCase()
	return props.facets.filter((f) => String(f.value).toLowerCase().includes(query) || (f.value && String(f.value).toLowerCase().includes(query)))
})

// Show limited items unless expanded
const visibleFacets = computed(() => {
	if (expanded.value || props.searchable) return filteredFacets.value
	return filteredFacets.value.slice(0, props.maxVisible)
})

// Show "show more" button if there are hidden items
const hasMore = computed(() => !expanded.value && filteredFacets.value.length > props.maxVisible)

// Count of hidden items
const hiddenCount = computed(() => filteredFacets.value.length - props.maxVisible)

function isSelected(value: unknown): boolean {
	return props.selected.includes(String(value))
}

function handleChange(value: unknown) {
	const strValue = String(value)
	const newSelected = isSelected(value) ? props.selected.filter((v) => v !== strValue) : [...props.selected, strValue]

	emit('update:selected', newSelected)
}

function toggleExpanded() {
	expanded.value = !expanded.value
}

function getDisplayLabel(facet: FacetItem): string {
	return String(facet.value)
}
</script>

<template>
	<div>
		<label class="insis-label">{{ label }}</label>

		<!-- Search input (if searchable) -->
		<div v-if="searchable" class="relative mb-2">
			<IconSearch class="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--insis-gray-500)]" />
			<input v-model="searchQuery" type="text" class="insis-input py-1 pl-7 text-xs" placeholder="Hledat..." />
		</div>

		<!-- Empty state -->
		<div v-if="filteredFacets.length === 0" class="text-sm text-[var(--insis-gray-500)]">
			<span v-if="searchQuery">Žádné výsledky</span>
			<span v-else>Žádné možnosti</span>
		</div>

		<!-- Checkbox list -->
		<div v-else class="space-y-1">
			<label v-for="facet in visibleFacets" :key="String(facet.value)" class="insis-checkbox-label">
				<input type="checkbox" class="insis-checkbox" :checked="isSelected(facet.value)" @change="handleChange(facet.value)" />
				<span class="flex-1 truncate text-sm">
					{{ getDisplayLabel(facet) }}
				</span>
				<span class="text-xs text-[var(--insis-gray-500)]"> ({{ facet.count }}) </span>
			</label>
		</div>

		<!-- Show more button -->
		<button v-if="hasMore && !searchable" type="button" class="insis-btn-text mt-2 flex items-center gap-1 text-xs" @click="toggleExpanded">
			<IconChevronDown :class="['h-3 w-3 transition-transform', expanded && 'rotate-180']" />
			{{ expanded ? 'Zobrazit méně' : `Zobrazit dalších ${hiddenCount}` }}
		</button>
	</div>
</template>
