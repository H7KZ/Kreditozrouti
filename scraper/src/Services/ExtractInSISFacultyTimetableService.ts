import * as cheerio from 'cheerio'
import { cleanText } from '@scraper/Utils/HTMLUtils'

export default class ExtractInSISFacultyTimetableService {
    static extractFaculties(html: string): { f_id: number; name: string }[] {
        const $ = cheerio.load(html)
        const result: { f_id: number; name: string }[] = []

        $('table').each((_, table) => {
            if (cleanText($(table).find('th').first().text()) !== 'Pracoviště') return

            $(table)
                .find('tbody tr')
                .each((_, row) => {
                    const tds = $(row).find('td')
                    if (tds.length < 3) return

                    const name = cleanText(tds.eq(0).text())
                    const href = tds.eq(2).find('a').attr('href') ?? ''
                    const match = /[?;]f=(-?\d+)/.exec(href)
                    if (!match) return

                    const f_id = parseInt(match[1], 10)
                    if (f_id === -1 || !name) return

                    result.push({ f_id, name })
                })
        })

        return result
    }

    static extractFacultyTimetable(html: string): { ident: string | null; max_year: number | null } {
        const $ = cheerio.load(html)
        let ident: string | null = null
        let max_year: number | null = null

        $('table tbody tr').each((_, row) => {
            const tds = $(row).find('td')
            if (tds.length < 4) return

            const period = cleanText(tds.eq(2).text())
            const workplace = cleanText(tds.eq(3).text())

            if (!ident && workplace) ident = workplace

            const yearMatch = /\b(\d{4})\/\d{4}\b/.exec(period)
            if (yearMatch) {
                const year = parseInt(yearMatch[1], 10)
                if (max_year === null || year > max_year) max_year = year
            }
        })

        return { ident, max_year }
    }

    static isPubliclyVisible(maxYear: number | null, referenceDate = new Date()): boolean {
        if (maxYear === null) return false
        const year = referenceDate.getFullYear()
        const currentAcademicYear = referenceDate.getMonth() >= 8 ? year : year - 1
        return maxYear >= currentAcademicYear
    }
}
