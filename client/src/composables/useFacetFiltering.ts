import type FacetItem from '@api/Interfaces/FacetItem'
import { computed, ref, type Ref } from 'vue'

export interface UseFacetFilteringOptions {
	/** Maximum visible items before "show more" */
	maxVisible?: number
	/** Initial search query */
	initialSearch?: string
}

/**
 * Facet filtering composable.
 *
 * @example
 * ```ts
 * const {
 *   searchQuery,
 *   listExpanded,
 *   visibleFacets,
 *   hasMore,
 *   hiddenCount,
 *   toggleListExpanded,
 * } = useFacetFiltering(facets, selected, { maxVisible: 5 })
 * ```
 */
export function useFacetFiltering(facets: Ref<FacetItem[]>, selected: Ref<string[]>, options: UseFacetFilteringOptions = {}) {
	const { maxVisible = 5, initialSearch = '' } = options

	const searchQuery = ref(initialSearch)
	const listExpanded = ref(false)

	/**
	 * Combined facets: includes selected items not in current API response.
	 * Shows selected items that may have been filtered out with count 0.
	 */
	const combinedFacets = computed(() => {
		const facetValues = new Set(facets.value.map((f) => String(f.value)))

		// Find selected items not in current facets
		const missingSelectedFacets: FacetItem[] = selected.value
			.filter((selectedValue) => !facetValues.has(selectedValue))
			.map((value) => ({
				value,
				count: 0,
			}))

		return [...missingSelectedFacets, ...facets.value]
	})

	/**
	 * Sorted facets: selected items first, then by count descending.
	 */
	const sortedFacets = computed(() => {
		return [...combinedFacets.value].sort((a, b) => {
			const aSelected = selected.value.includes(String(a.value))
			const bSelected = selected.value.includes(String(b.value))

			// Selected items come first
			if (aSelected && !bSelected) return -1
			if (!aSelected && bSelected) return 1

			// Among selected, maintain selection order
			if (aSelected && bSelected) {
				return selected.value.indexOf(String(a.value)) - selected.value.indexOf(String(b.value))
			}

			// Among non-selected, sort by count descending
			return (b.count ?? 0) - (a.count ?? 0)
		})
	})

	/**
	 * Filter facets by search query.
	 *
	 * @param getLabel - Function to get display label for a facet
	 */
	function filterBySearch(getLabel: (facet: FacetItem) => string) {
		return computed(() => {
			if (!searchQuery.value.trim()) return sortedFacets.value

			const query = searchQuery.value.toLowerCase()
			return sortedFacets.value.filter((f) => {
				const valueStr = String(f.value).toLowerCase()
				const displayLabel = getLabel(f).toLowerCase()
				return valueStr.includes(query) || displayLabel.includes(query)
			})
		})
	}

	/**
	 * Get visible facets with pagination.
	 * Always shows all selected items + up to maxVisible non-selected.
	 */
	function getVisibleFacets(filteredFacets: Ref<FacetItem[]>) {
		return computed(() => {
			if (listExpanded.value) return filteredFacets.value

			const selectedItems = filteredFacets.value.filter((f) => selected.value.includes(String(f.value)))
			const nonSelectedItems = filteredFacets.value.filter((f) => !selected.value.includes(String(f.value)))

			const remainingSlots = Math.max(0, maxVisible - selectedItems.length)
			return [...selectedItems, ...nonSelectedItems.slice(0, remainingSlots)]
		})
	}

	/**
	 * Check if there are more items to show.
	 */
	function hasMoreItems(filteredFacets: Ref<FacetItem[]>, visibleFacets: Ref<FacetItem[]>) {
		return computed(() => !listExpanded.value && filteredFacets.value.length > visibleFacets.value.length)
	}

	/**
	 * Get count of hidden items.
	 */
	function getHiddenCount(filteredFacets: Ref<FacetItem[]>, visibleFacets: Ref<FacetItem[]>) {
		return computed(() => filteredFacets.value.length - visibleFacets.value.length)
	}

	/**
	 * Toggle list expansion.
	 */
	function toggleListExpanded() {
		listExpanded.value = !listExpanded.value
	}

	/**
	 * Check if a value is selected.
	 */
	function isSelected(value: unknown): boolean {
		return selected.value.includes(String(value))
	}

	/**
	 * Toggle selection of a value.
	 */
	function toggleSelection(value: unknown): string[] {
		const strValue = String(value)
		return isSelected(value) ? selected.value.filter((v) => v !== strValue) : [...selected.value, strValue]
	}

	return {
		// State
		searchQuery,
		listExpanded,

		// Computed
		combinedFacets,
		sortedFacets,

		// Functions
		filterBySearch,
		getVisibleFacets,
		hasMoreItems,
		getHiddenCount,
		toggleListExpanded,
		isSelected,
		toggleSelection,
	}
}
