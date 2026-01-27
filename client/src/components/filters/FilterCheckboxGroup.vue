<script setup lang="ts">
import FacetItem from '@api/Interfaces/FacetItem.ts'
import { computed, ref } from 'vue'
import { LocaleMessages } from 'vue-i18n'

/*
 * FilterCheckboxGroup
 * Reusable checkbox group for facet filtering.
 * Supports collapsible header, collapsible list and optional search.
 */

interface Props {
	label: string
	facets: FacetItem[]
	translations?: Record<string, LocaleMessages<{ static: string }>>
	selected: string[]
	searchable?: boolean
	maxVisible?: number
	defaultCollapsed?: boolean
}

interface Emits {
	(e: 'update:selected', values: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
	searchable: false,
	maxVisible: 5,
	defaultCollapsed: false,
})

const emit = defineEmits<Emits>()

/** Whether the entire filter group is collapsed */
const isCollapsed = ref(props.defaultCollapsed)

/** Whether the list is expanded to show all items */
const listExpanded = ref(false)
const searchQuery = ref('')

// Filter facets by search query
const filteredFacets = computed(() => {
	if (!searchQuery.value.trim()) return props.facets

	const query = searchQuery.value.toLowerCase()
	return props.facets.filter((f) => String(f.value).toLowerCase().includes(query) || (f.value && String(f.value).toLowerCase().includes(query)))
})

// Show limited items unless expanded
const visibleFacets = computed(() => {
	if (listExpanded.value) return filteredFacets.value
	return filteredFacets.value.slice(0, props.maxVisible)
})

// Show "show more" button if there are hidden items
const hasMore = computed(() => !listExpanded.value && filteredFacets.value.length > props.maxVisible)

// Count of hidden items
const hiddenCount = computed(() => filteredFacets.value.length - props.maxVisible)

// Count of selected items in this group
const selectedCount = computed(() => props.selected.length)

function isSelected(value: unknown): boolean {
	return props.selected.includes(String(value))
}

function handleChange(value: unknown) {
	const strValue = String(value)
	const newSelected = isSelected(value) ? props.selected.filter((v) => v !== strValue) : [...props.selected, strValue]

	emit('update:selected', newSelected)
}

function toggleCollapsed() {
	isCollapsed.value = !isCollapsed.value
}

function toggleListExpanded() {
	listExpanded.value = !listExpanded.value
}

function getDisplayLabel(facet: FacetItem): string {
	return props.translations && props.translations[String(facet.value)] ? props.translations[String(facet.value)]!.body!.static : String(facet.value)
}
</script>

<template>
	<div class="filter-group">
		<!-- Collapsible header -->
		<button type="button" class="flex cursor-pointer w-full items-center justify-between py-1 text-left" @click="toggleCollapsed">
			<span class="insis-label mb-0 flex items-center gap-1.5">
				{{ label }}
				<span v-if="selectedCount > 0" class="rounded-full bg-[var(--insis-blue)] px-1.5 py-0.5 text-[10px] text-white">
					{{ selectedCount }}
				</span>
			</span>
			<svg
				class="h-4 w-4 text-[var(--insis-gray-500)] transition-transform"
				:class="{ 'rotate-180': !isCollapsed }"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		<!-- Collapsible content -->
		<div v-show="!isCollapsed" class="mt-2">
			<!-- Search input (if searchable) -->
			<div v-if="searchable" class="relative mb-2">
				<svg
					class="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--insis-gray-500)]"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					v-model="searchQuery"
					type="text"
					class="insis-input py-1 pl-7 text-xs"
					:placeholder="$t('components.filters.FilterCheckboxGroup.searchPlaceholder')"
				/>
			</div>

			<!-- Empty state -->
			<div v-if="filteredFacets.length === 0" class="text-sm text-[var(--insis-gray-500)]">
				<span v-if="searchQuery">{{ $t('common.noResults') }}</span>
				<span v-else>{{ $t('common.noOptions') }}</span>
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
			<button v-if="hasMore" type="button" class="insis-btn-text mt-2 flex items-center gap-1 text-xs" @click="toggleListExpanded">
				<svg class="h-3 w-3 transition-transform" :class="{ 'rotate-180': listExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
				{{ listExpanded ? $t('common.showLess') : $t('common.showMore', { count: hiddenCount }) }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.filter-group {
	border-bottom: 1px solid var(--insis-border-light);
	padding-bottom: 0.75rem;
}

.filter-group:last-child {
	border-bottom: none;
}
</style>
