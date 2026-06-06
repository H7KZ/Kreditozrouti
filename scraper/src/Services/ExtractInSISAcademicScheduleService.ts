import type { InSISSemester } from '@scraper/types/insis'
import * as cheerio from 'cheerio'
import { cleanText } from '@scraper/Utils/HTMLUtils'
import { extractSemester, extractYear } from '@scraper/Utils/InSISUtils'

export interface HarmonogramFaculty {
    insis_faculty_id: number
    title: string
}

export interface HarmonogramPeriod {
    insis_period_id: number
    insis_faculty_id: number
    faculty_ident: string
    semester: InSISSemester | null
    year: number
    level: string | null
    starts_at: string // YYYY-MM-DD
    ends_at: string // YYYY-MM-DD
}

export interface HarmonogramEvent {
    title: string
    starts_at: string | null // YYYY-MM-DDTHH:mm:00
    ends_at: string | null // YYYY-MM-DDTHH:mm:00
}

export default class ExtractInSISAcademicScheduleService {
    static extractFaculties(html: string): HarmonogramFaculty[] {
        const $ = cheerio.load(html)
        const faculties: HarmonogramFaculty[] = []
        $('div.vyber-fakult a.fakulta').each((_, el) => {
            const href = $(el).attr('href') ?? ''
            const match = /[?;]?fakulta=(\d+)/.exec(href)
            if (!match) return
            const insis_faculty_id = parseInt(match[1], 10)
            const title = cleanText($(el).find('.nazev').text())
            if (insis_faculty_id && title) faculties.push({ insis_faculty_id, title })
        })
        return faculties
    }

    static extractPeriods(html: string, insis_faculty_id: number): HarmonogramPeriod[] {
        const $ = cheerio.load(html)
        const periods: HarmonogramPeriod[] = []
        $('table tbody tr').each((_, row) => {
            const tds = $('td', row)
            if (tds.length < 4) return
            const labelText = cleanText(tds.eq(0).text())
            const startText = cleanText(tds.eq(1).text())
            const endText = cleanText(tds.eq(2).text())
            const href = tds.eq(3).find('a').attr('href') ?? ''
            const periodIdMatch = /obdobi=(\d+)/.exec(href)
            if (!periodIdMatch || !labelText || !startText || !endText) return
            const insis_period_id = parseInt(periodIdMatch[1], 10)
            const parsed = parsePeriodLabel(labelText)
            if (!parsed) return
            const starts_at = parseDateDMY(startText)
            const ends_at = parseDateDMY(endText)
            if (!starts_at || !ends_at) return
            periods.push({
                insis_period_id,
                insis_faculty_id,
                faculty_ident: parsed.facultyIdent,
                semester: parsed.semester,
                year: parsed.year,
                level: parsed.level,
                starts_at,
                ends_at
            })
        })
        return periods
    }

    static extractEvents(html: string): HarmonogramEvent[] {
        const $ = cheerio.load(html)
        const events: HarmonogramEvent[] = []
        $('table.strom tbody tr').each((_, row) => {
            const tds = $('td', row)
            if (tds.length < 4) return
            if (tds.eq(0).attr('align') === 'right') return
            const dateTd = tds.eq(2)
            const titleTd = tds.eq(3)
            const title = cleanText(titleTd.text())
            if (!title) return
            if (dateTd.find('b').length === 0) return
            const dateText = cleanText(dateTd.text())
            if (!dateText) return
            const parsed = parseDateTimeRange(dateText)
            if (!parsed) return
            events.push({ title, starts_at: parsed.starts_at, ends_at: parsed.ends_at })
        })
        return events
    }
}

function parsePeriodLabel(label: string): { semester: InSISSemester | null; year: number; level: string | null; facultyIdent: string } | null {
    const parts = label
        .split(' - ')
        .map(p => p.trim())
        .filter(Boolean)
    if (parts.length < 2) return null
    const facultyIdent = parts[parts.length - 1]
    if (!facultyIdent) return null
    const yearPart = parts[0]
    const semester = extractSemester(yearPart)
    const year = extractYear(yearPart)
    if (year === null) return null
    const middleParts = parts.slice(1, parts.length - 1)
    const level = middleParts.length > 0 ? middleParts.join(' - ') : null
    return { semester, year, level, facultyIdent }
}

function parseDateDMY(text: string): string | null {
    const parts = text.trim().split('.')
    if (parts.length !== 3) return null
    const [day, month, year] = parts.map(p => p.trim())
    if (!day || !month || !year) return null
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseDateTimeRange(text: string): { starts_at: string | null; ends_at: string | null } | null {
    const dtPattern = /(\d{1,2})\. (\d{1,2})\. (\d{4}) (\d{1,2}:\d{2})/g
    const matches = [...text.matchAll(dtPattern)]
    if (matches.length === 0) return null
    const toISO = (m: RegExpMatchArray): string => {
        const [, day, month, year, time] = m
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`
    }
    if (matches.length === 1) {
        const dt = toISO(matches[0])
        return { starts_at: dt, ends_at: dt }
    }
    return { starts_at: toISO(matches[0]), ends_at: toISO(matches[1]) }
}
