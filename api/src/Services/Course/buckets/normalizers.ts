import type { FacetItem } from '@shared/http/facets'

// Forward maps: raw InSIS Czech string → stable enum key
export const LEVEL_NORM: Record<string, string> = {
	bakalářský: 'bachelor',
	'magisterský navazující': 'master',
	doktorský: 'doctoral',
	MBA: 'mba',
	kurz: 'course'
}

export const LANGUAGE_NORM: Record<string, string> = {
	čeština: 'czech',
	angličtina: 'english',
	němčina: 'german',
	španělština: 'spanish',
	francouzština: 'french',
	ruština: 'russian',
	italština: 'italian',
	čínština: 'chinese',
	švédština: 'swedish',
	portugalština: 'portuguese'
}

export const MODE_OF_COMPLETION_NORM: Record<string, string> = {
	zkouška: 'exam',
	zápočet: 'credit',
	obhajoba: 'defense'
}

// Reverse maps: stable enum key → raw InSIS Czech string
export const LEVEL_DENORM: Record<string, string> = Object.fromEntries(Object.entries(LEVEL_NORM).map(([raw, key]) => [key, raw]))

export const LANGUAGE_DENORM: Record<string, string> = Object.fromEntries(Object.entries(LANGUAGE_NORM).map(([raw, key]) => [key, raw]))

export const MODE_OF_COMPLETION_DENORM: Record<string, string> = Object.fromEntries(Object.entries(MODE_OF_COMPLETION_NORM).map(([raw, key]) => [key, raw]))

/**
 * Forward-normalizes facet values using a norm map.
 * Aggregates counts for values that map to the same key.
 * Unknown values are preserved as-is (no silent data loss).
 */
export function normalizeFacet(data: FacetItem[], norm: Record<string, string>): FacetItem[] {
	const map = new Map<string, number>()
	for (const row of data) {
		if (typeof row.value !== 'string') continue
		const key = norm[row.value] ?? row.value
		map.set(key, (map.get(key) ?? 0) + Number(row.count))
	}
	return Array.from(map.entries())
		.map(([value, count]) => ({ value, count }))
		.sort((a, b) => b.count - a.count)
}
