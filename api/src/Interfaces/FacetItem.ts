/**
 * Represents a single facet category value and its occurrence count.
 */
export default interface FacetItem {
	/**
	 * The unique identifier or label for this facet option
	 *
	 * @type {string | null}
	 */
	value: string | number | Date | null

	/**
	 * The number of records matching this specific option
	 *
	 * @type {number}
	 */
	count: number
}
