<script setup lang="ts">
import type FacetItem from '@api/Interfaces/FacetItem'
import { useCourseLabels, useFacetFiltering } from '@client/composables'
import { computed, ref, toRef } from 'vue'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconSearch from '~icons/lucide/search'

/*
 * FilterCheckboxGroup
 * Reusable checkbox group for facet filtering.
 * Supports collapsible header, collapsible list and optional search.
 * Selected items are shown at the top, including items that may not be in current facets.
 * Refactored to use composables for filtering logic and label translation.
 */

// Composables
const { getLabel } = useCourseLabels()

interface Props {
	label: string
	facets: FacetItem[]
	translations?: string
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

// Use facet filtering composable
const { searchQuery, listExpanded, filterBySearch, getVisibleFacets, hasMoreItems, getHiddenCount, toggleListExpanded, isSelected, toggleSelection } =
	useFacetFiltering(toRef(props, 'facets'), toRef(props, 'selected'), {
		maxVisible: props.maxVisible,
	})

/** Whether the entire filter group is collapsed */
const isCollapsed = ref(props.defaultCollapsed)

/** Get display label for a facet using translations or raw value */
function getDisplayLabel(facet: FacetItem): string {
	const value = String(facet.value)
	return props.translations ? getLabel(props.translations, value) : value
}

// Filter facets by search query (uses getDisplayLabel for matching)
const filteredFacets = filterBySearch(getDisplayLabel)

// Visible facets with pagination
const visibleFacets = getVisibleFacets(filteredFacets)

// Has more items to show
const hasMore = hasMoreItems(filteredFacets, visibleFacets)

// Count of hidden items
const hiddenCount = getHiddenCount(filteredFacets, visibleFacets)

// Count of selected items in this group
const selectedCount = computed(() => props.selected.length)

function handleChange(value: unknown) {
	const newSelected = toggleSelection(value)
	emit('update:selected', newSelected)
}

function toggleCollapsed() {
	isCollapsed.value = !isCollapsed.value
}

function clearFilter() {
	emit('update:selected', [])
}

const isFiltering = computed(() => props.selected.length > 0)
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
			<IconChevronDown :class="['h-4 w-4 text-[var(--insis-gray-500)] transition-transform', { 'rotate-180': !isCollapsed }]" />
		</button>

		<!-- Collapsible content -->
		<div v-show="!isCollapsed" class="mt-2 space-y-3">
			<button v-if="isFiltering" type="button" class="text-xs cursor-pointer text-[var(--insis-blue)] hover:underline" @click="clearFilter">
				{{ $t('common.clearFilter') }}
			</button>

			<!-- Search input (if searchable) -->
			<div v-if="searchable" class="relative mb-2">
				<IconSearch class="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--insis-gray-500)]" />
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
				<label
					v-for="facet in visibleFacets"
					:key="String(facet.value)"
					:class="['insis-checkbox-label', isSelected(facet.value) ? 'bg-[var(--insis-blue-light)] rounded px-1 -mx-1' : '']"
				>
					<input type="checkbox" class="insis-checkbox" :checked="isSelected(facet.value)" @change="handleChange(facet.value)" />
					<span class="flex-1 truncate text-sm">
						{{ getDisplayLabel(facet) }}
					</span>
					<span :class="['text-xs', facet.count === 0 ? 'text-[var(--insis-gray-400)] italic' : 'text-[var(--insis-gray-500)]']">
						({{ facet.count }})
					</span>
				</label>
			</div>

			<!-- Show more button -->
			<button v-if="hasMore" type="button" class="insis-btn-text mt-2 flex items-center gap-1 text-xs" @click="toggleListExpanded">
				<IconChevronDown :class="['h-3 w-3 transition-transform', { 'rotate-180': listExpanded }]" />
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
