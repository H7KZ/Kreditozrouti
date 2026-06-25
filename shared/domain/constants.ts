// shared/domain/constants.ts
import type { FacetItem } from '../http/facets.js'

export const DayValues = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type Day = (typeof DayValues)[number]

export const INSIS_DAY_NORM: Record<string, Day> = {
	'Pondělí': 'monday',
	'Úterý': 'tuesday',
	'Středa': 'wednesday',
	'Čtvrtek': 'thursday',
	'Pátek': 'friday',
	'Sobota': 'saturday',
	'Neděle': 'sunday'
}

export const INSIS_DAY_DENORM: Record<Day, string> = Object.fromEntries(
	Object.entries(INSIS_DAY_NORM).map(([raw, key]) => [key, raw])
) as Record<Day, string>

export const DAY_ICAL_MAP: Record<Day, { byday: string; jsDay: number }> = {
	monday:    { byday: 'MO', jsDay: 1 },
	tuesday:   { byday: 'TU', jsDay: 2 },
	wednesday: { byday: 'WE', jsDay: 3 },
	thursday:  { byday: 'TH', jsDay: 4 },
	friday:    { byday: 'FR', jsDay: 5 },
	saturday:  { byday: 'SA', jsDay: 6 },
	sunday:    { byday: 'SU', jsDay: 0 }
}

export const MODE_OF_DELIVERY_NORM: Record<string, string> = {
	'prezenční':                                        'in_person',
	'kombinovaná':                                      'combined',
	'distanční':                                        'distance',
	'konzultační při semestrální výuce':                'consultative',
	'konzultační pro distanční (kombinované) programy': 'consultative_distance',
	'mimosemestr':                                      'extra_semester',
	'žádná':                                            'none'
}

// Moved from api/src/Services/Course/buckets/normalizers.ts
export const LEVEL_NORM: Record<string, string> = {
	'bakalářský':              'bachelor',
	'magisterský navazující':  'master',
	'doktorský':               'doctoral',
	'mba':                     'mba',
	'MBA':                     'mba',
	'kurz':                    'course',
	'celoživotní vzdělávání':  'lifelong_learning',
	'zahraniční studenti':     'international_students',
	'magisterský':             'master_undivided'
}

export const LEVEL_DENORM: Record<string, string> = Object.fromEntries(
	Object.entries(LEVEL_NORM).map(([raw, key]) => [key, raw])
)

export const LANGUAGE_NORM: Record<string, string> = {
	'čeština':       'czech',
	'angličtina':    'english',
	'němčina':       'german',
	'španělština':   'spanish',
	'francouzština': 'french',
	'ruština':       'russian',
	'italština':     'italian',
	'čínština':      'chinese',
	'švédština':     'swedish',
	'portugalština': 'portuguese'
}

export const LANGUAGE_DENORM: Record<string, string> = Object.fromEntries(
	Object.entries(LANGUAGE_NORM).map(([raw, key]) => [key, raw])
)

export const MODE_OF_COMPLETION_NORM: Record<string, string> = {
	'zkouška':  'exam',
	'zápočet':  'credit',
	'obhajoba': 'defense'
}

export const MODE_OF_COMPLETION_DENORM: Record<string, string> = Object.fromEntries(
	Object.entries(MODE_OF_COMPLETION_NORM).map(([raw, key]) => [key, raw])
)

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
