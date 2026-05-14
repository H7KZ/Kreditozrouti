import { InSISDayValues } from './insis.js'
import type { InSISDay } from './insis.js'

export function getDayFromDate(dateStr: string | null | undefined): InSISDay | null {
	if (!dateStr) return null

	try {
		const isoDate = dateStr.split('.').reverse().join('-')
		const date = new Date(isoDate + 'T00:00')

		if (isNaN(date.getTime())) return null

		const jsDay = date.getDay()
		const dayIndex = jsDay === 0 ? 6 : jsDay - 1

		return InSISDayValues[dayIndex] ?? null
	} catch {
		return null
	}
}

export function parseDateString(dateStr: string): Date | null {
	try {
		const isoDate = dateStr.split('.').reverse().join('-')
		const date = new Date(isoDate + 'T00:00')
		return isNaN(date.getTime()) ? null : date
	} catch {
		return null
	}
}

export function compareDateStrings(a: string, b: string): number {
	const dateA = parseDateString(a)
	const dateB = parseDateString(b)

	if (!dateA && !dateB) return 0
	if (!dateA) return 1
	if (!dateB) return -1

	return dateA.getTime() - dateB.getTime()
}
