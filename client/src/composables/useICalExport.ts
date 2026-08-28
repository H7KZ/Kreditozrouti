import type { SelectedCourseUnit } from '@client/types'
import type { ICalCourseConfig } from '@client/utils/ical'
import type { InSISSemester } from '@kreditozrouti/types'
import analytics from '@client/analytics'
import { createICalLink } from '@client/services'
import { generateIcal } from '@client/utils/ical'

/**
 * Returns default semester start/end dates for the current/upcoming semester,
 * derived from today's date. The wizard's study-plan year is a plan *version* (e.g.
 * a 2023/2024 plan) and does NOT track the year the student actually attends, so it
 * must never drive calendar dates - doing so exports stale years (bug: 2024 in 2026).
 * The user can still adjust the dates manually in the export dialog.
 *
 * Each semester picks its own calendar year so the whole year is covered with no gaps:
 * ZS (autumn, late September → mid-December): only January still belongs to the prior
 *   autumn's ZS; February onward already points at this year's upcoming/current autumn.
 * LS (spring, mid-February → late May): from June onward the upcoming LS is next year;
 *   January through May is this year's current/imminent LS.
 */
export function getDefaultSemesterDates(semester: InSISSemester, now: Date = new Date()): { start: string; end: string } {
	const year = now.getFullYear()
	const month = now.getMonth() // 0 = January
	if (semester === 'ZS') {
		const ay = month === 0 ? year - 1 : year
		return { start: `${ay}-09-21`, end: `${ay}-12-18` }
	}
	const sy = month >= 5 ? year + 1 : year
	return { start: `${sy}-02-16`, end: `${sy}-05-17` }
}

// webcal:// uses same host/path as the HTTP API, just a different scheme
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const WEBCAL_BASE = API_BASE.replace(/^https?:\/\//, 'webcal://')

export function useICalExport() {
	function exportIcal(units: SelectedCourseUnit[], configs: ICalCourseConfig[], semesterStart: string, semesterEnd: string): void {
		if (units.length === 0) return

		const icsContent = generateIcal(units, configs, new Date(semesterStart), new Date(semesterEnd))
		const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'rozvrh-kreditozrouti.ics'
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)

		analytics.track('ical_exported', { unit_count: units.length })
	}

	async function generateWebcalLink(units: SelectedCourseUnit[], configs: ICalCourseConfig[], semesterStart: string, semesterEnd: string): Promise<string> {
		const { id } = await createICalLink({ units, configs, semesterStart, semesterEnd })
		return `${WEBCAL_BASE}/ical/${id}`
	}

	return { exportIcal, generateWebcalLink }
}
