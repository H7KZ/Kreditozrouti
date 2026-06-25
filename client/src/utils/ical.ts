import type { SelectedCourseUnit } from '@client/types'
import { DAY_ICAL_MAP } from '@shared/domain/constants'

export interface ICalCourseConfig {
	slotId: number
	title: string
	location: string
	description: string
}

function pad(n: number): string {
	return String(n).padStart(2, '0')
}

/** Format a Date + time-in-minutes as RFC 5545 local datetime: YYYYMMDDTHHMMSS */
function toIcalLocal(date: Date, minutesFromMidnight: number): string {
	const h = Math.floor(minutesFromMidnight / 60)
	const m = minutesFromMidnight % 60
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` + `T${pad(h)}${pad(m)}00`
}

/** Escape RFC 5545 text: backslash, comma, semicolon, newline */
function escapeText(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

/** Fold long lines per RFC 5545 §3.1 (75-octet limit) */
function fold(line: string): string {
	const bytes = new TextEncoder().encode(line)
	if (bytes.length <= 75) return line
	const result: string[] = []
	let start = 0
	let firstLine = true
	while (start < bytes.length) {
		const limit = firstLine ? 75 : 74
		let end = start + limit
		// don't split a multi-byte UTF-8 sequence
		while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--
		result.push((firstLine ? '' : ' ') + new TextDecoder().decode(bytes.slice(start, end)))
		start = end
		firstLine = false
	}
	return result.join('\r\n')
}

/**
 * Find the first occurrence of `targetJsDay` (0=Sun…6=Sat) on or after `from`.
 * Returns a new Date (time set to 00:00:00 local).
 */
function firstOccurrence(from: Date, targetJsDay: number): Date {
	const d = new Date(from)
	d.setHours(0, 0, 0, 0)
	const delta = (targetJsDay - d.getDay() + 7) % 7
	d.setDate(d.getDate() + delta)
	return d
}

/** Format a Date as RFC 5545 UTC datetime for UNTIL: YYYYMMDDTHHMMSSZ */
function toIcalUtcDate(date: Date): string {
	return (
		`${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
		`T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
	)
}

const WATERMARK = 'kreditozrouti.cz'

/**
 * Generate a .ics file string from selected course units and per-course display configs.
 * Recurring units (day-based) get RRULE:FREQ=WEEKLY;UNTIL=<semesterEnd>.
 * One-off units (date-based) get a single VEVENT with no RRULE.
 */
export function generateIcal(units: SelectedCourseUnit[], configs: ICalCourseConfig[], semesterStart: Date, semesterEnd: Date): string {
	const configMap = new Map<number, ICalCourseConfig>(configs.map(c => [c.slotId, c]))

	const untilDate = new Date(semesterEnd)
	untilDate.setHours(23, 59, 59, 0)

	const dtstamp = toIcalUtcDate(new Date())

	const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kreditozrouti.cz//Kreditozrouti//CS', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']

	for (const unit of units) {
		const cfg = configMap.get(unit.slotId)
		const summary = cfg?.title ?? unit.courseTitle
		const location = cfg?.location ?? unit.location ?? ''
		const rawDescription = cfg?.description ?? `${unit.courseIdent}${unit.lecturer ? ` · ${unit.lecturer}` : ''}`
		const description = `${rawDescription}\n\n${WATERMARK}`
		const uid = `slot-${unit.slotId}@kreditozrouti.cz`

		if (unit.day && DAY_ICAL_MAP[unit.day]) {
			const { byday, jsDay } = DAY_ICAL_MAP[unit.day]!
			const firstDate = firstOccurrence(semesterStart, jsDay)

			if (firstDate > untilDate) continue

			lines.push('BEGIN:VEVENT')
			lines.push(fold(`UID:${uid}`))
			lines.push(`DTSTAMP:${dtstamp}`)
			lines.push(fold(`SUMMARY:${escapeText(summary)}`))
			lines.push(fold(`DTSTART:${toIcalLocal(firstDate, unit.timeFrom)}`))
			lines.push(fold(`DTEND:${toIcalLocal(firstDate, unit.timeTo)}`))
			lines.push(fold(`RRULE:FREQ=WEEKLY;BYDAY=${byday};UNTIL=${toIcalUtcDate(untilDate)}`))
			if (location) lines.push(fold(`LOCATION:${escapeText(location)}`))
			lines.push(fold(`DESCRIPTION:${escapeText(description)}`))
			lines.push('END:VEVENT')
		} else if (unit.date) {
			const eventDate = new Date(unit.date)
			if (isNaN(eventDate.getTime())) continue
			eventDate.setHours(0, 0, 0, 0)

			lines.push('BEGIN:VEVENT')
			lines.push(fold(`UID:${uid}`))
			lines.push(`DTSTAMP:${dtstamp}`)
			lines.push(fold(`SUMMARY:${escapeText(summary)}`))
			lines.push(fold(`DTSTART:${toIcalLocal(eventDate, unit.timeFrom)}`))
			lines.push(fold(`DTEND:${toIcalLocal(eventDate, unit.timeTo)}`))
			if (location) lines.push(fold(`LOCATION:${escapeText(location)}`))
			lines.push(fold(`DESCRIPTION:${escapeText(description)}`))
			lines.push('END:VEVENT')
		}
	}

	lines.push('END:VCALENDAR')
	return lines.join('\r\n')
}
