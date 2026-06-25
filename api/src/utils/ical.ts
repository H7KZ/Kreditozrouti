import type { InSISDay } from '@shared/domain/insis'
import type { ICalConfig, ICalUnit } from '@shared/http/ical'

const DAY_MAP: Record<InSISDay, { byday: string; jsDay: number }> = {
	Pondělí: { byday: 'MO', jsDay: 1 },
	Úterý: { byday: 'TU', jsDay: 2 },
	Středa: { byday: 'WE', jsDay: 3 },
	Čtvrtek: { byday: 'TH', jsDay: 4 },
	Pátek: { byday: 'FR', jsDay: 5 },
	Sobota: { byday: 'SA', jsDay: 6 },
	Neděle: { byday: 'SU', jsDay: 0 }
}

function pad(n: number): string {
	return String(n).padStart(2, '0')
}

function toIcalLocal(date: Date, minutesFromMidnight: number): string {
	const h = Math.floor(minutesFromMidnight / 60)
	const m = minutesFromMidnight % 60
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`
}

function toIcalUtcDate(date: Date): string {
	return (
		`${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
		`T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
	)
}

function escapeText(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function fold(line: string): string {
	const bytes = Buffer.from(line, 'utf8')
	if (bytes.length <= 75) return line
	const result: string[] = []
	let start = 0
	let firstLine = true
	while (start < bytes.length) {
		const limit = firstLine ? 75 : 74
		let end = start + limit
		while (end < bytes.length && ((bytes[end] ?? 0) & 0xc0) === 0x80) end--
		result.push((firstLine ? '' : ' ') + bytes.slice(start, end).toString('utf8'))
		start = end
		firstLine = false
	}
	return result.join('\r\n')
}

function firstOccurrence(from: Date, targetJsDay: number): Date {
	const d = new Date(from)
	d.setHours(0, 0, 0, 0)
	const delta = (targetJsDay - d.getDay() + 7) % 7
	d.setDate(d.getDate() + delta)
	return d
}

const WATERMARK = 'kreditozrouti.cz'

export function generateIcal(units: ICalUnit[], configs: ICalConfig[], semesterStart: Date, semesterEnd: Date): string {
	const configMap = new Map<number, ICalConfig>(configs.map(c => [c.slotId, c]))

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

		const dayEntry = unit.day ? DAY_MAP[unit.day] : undefined
		if (dayEntry) {
			const { byday, jsDay } = dayEntry
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
