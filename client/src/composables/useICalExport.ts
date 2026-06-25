import type { SelectedCourseUnit } from '@client/types'
import type { ICalCourseConfig } from '@client/utils/ical'
import type { InSISSemester } from '@shared/domain/insis'
import analytics from '@client/analytics'
import { generateIcal } from '@client/utils/ical'

/**
 * Returns default semester start/end dates for the given VŠE academic year and semester.
 * year = the autumn year of the academic year (e.g. 2025 for "2025/2026").
 * ZS: late September → mid-January next year (13 weeks)
 * LS: mid-February next year → late May next year (13 weeks)
 */
export function getDefaultSemesterDates(year: number | null, semester: InSISSemester): { start: string; end: string } {
	const y = year ?? new Date().getFullYear()
	if (semester === 'ZS') {
		return { start: `${y}-09-29`, end: `${y + 1}-01-17` }
	}
	return { start: `${y + 1}-02-16`, end: `${y + 1}-05-30` }
}

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

	return { exportIcal }
}
