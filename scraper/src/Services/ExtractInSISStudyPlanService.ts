import type { InSISSemester, ScraperInSISFaculty, ScraperInSISStudyPlan, ScraperInSISStudyPlanCourse } from '@scraper/types/insis'
import type { CheerioAPI } from 'cheerio'
import * as cheerio from 'cheerio'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import { cleanText, getRowValueCaseInsensitive, normalizeUrl, serializeValue } from '@scraper/Utils/HTMLUtils'
import { extractSemester, extractYear, parseGroupCode } from '@scraper/Utils/InSISUtils'

/**
 * Extracts study plan data from InSIS pages.
 * Handles faculty navigation, plan URLs, detailed plan content,
 * and study plan extraction from course pages.
 */
export default class ExtractInSISStudyPlanService {
    // Public API

    /**
     * Extracts study plan ID from URL.
     */
    static extractIdFromUrl(url: string): number | null {
        const match = /stud_plan=(\d+)/.exec(url)
        return match ? parseInt(match[1], 10) : null
    }

    /**
     * Extracts Faculty URLs from the Study Plans Overview page.
     */
    static extractFaculties(html: string): { title: string; url: string }[] {
        const $ = cheerio.load(html)
        const faculties: { title: string; url: string }[] = []

        $('.vyber-fakult a.fakulta').each((_, el) => {
            const url = $(el).attr('href')
            const title = $(el).text().trim()

            if (url)
                faculties.push({
                    title: cleanText(title),
                    url: normalizeUrl(url)
                })
        })

        return faculties
    }

    /**
     * Extracts navigation URLs for drilling down into the hierarchy.
     * Excludes final study plan links.
     *
     * @param html - HTML content to parse
     */
    static extractNavigationUrls(html: string): { texts: string[]; url: string }[] {
        const $ = cheerio.load(html)
        const navigations: { texts: string[]; url: string }[] = []

        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const anchor = $(el).closest('a')
            const url = anchor.attr('href')

            if (!url || url.includes('stud_plan=')) return

            const texts = anchor
                .closest('tr')
                .find('td')
                .map((_, td) => cleanText($(td).text()))
                .get()

            navigations.push({
                texts: texts,
                url: normalizeUrl(url)
            })
        })

        return navigations
    }

    /**
     * Extracts final study plan URLs from navigation page.
     */
    static extractPlanUrls(html: string): string[] {
        const $ = cheerio.load(html)
        const urls = new Set<string>()

        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const href = $(el).closest('a').attr('href')

            if (href?.includes('stud_plan=')) urls.add(normalizeUrl(href))
        })

        return [...urls]
    }

    /**
     * Extracts complete study plan details including course categorization.
     */
    static extract(html: string, url: string): ScraperInSISStudyPlan {
        const $ = cheerio.load(html)

        const id = this.extractIdFromUrl(url)
        if (id === null) console.warn('Study Plan ID not found in the URL:', url)

        // Extraction
        const { ident, title } = this.extractIdentAndTitle($)
        const faculty = this.extractFaculty($)
        const { semester, year } = this.extractSemesterAndYear($)
        const level = getRowValueCaseInsensitive($, 'Typ studia:')?.trim().toLowerCase() ?? null
        const mode_of_study = getRowValueCaseInsensitive($, 'Forma:')?.trim().toLowerCase() ?? null
        const study_length = getRowValueCaseInsensitive($, 'Délka studia:')?.trim().toLowerCase() ?? null

        const courses = this.extractCourses($)

        return {
            id: id ?? -1,
            url,
            ident,
            title,
            faculty,
            semester,
            year,
            level,
            mode_of_study,
            study_length,
            courses: courses.length > 0 ? courses : null
        }
    }

    // Extraction

    /**
     * Extracts Faculty object (title and ident).
     * Parses from "Fakulta:" row and "Počáteční období:" row (which contains the ident suffix).
     */
    private static extractFaculty($: CheerioAPI): ScraperInSISFaculty | null {
        const facultyTitle = getRowValueCaseInsensitive($, 'Fakulta:')?.split(' (')[0].trim() ?? null

        // Faculty Ident is often hidden in the period string, e.g., "ZS 2023/2024 - FIS"
        const periodValue = getRowValueCaseInsensitive($, 'Počáteční období:')
        let facultyIdent: string | null = null

        if (periodValue) {
            const parts = periodValue.split('-').map(p => p.trim())

            if (parts.length >= 2) {
                const lastPart = parts[parts.length - 1]

                if (/^[A-Z0-9]+$/.test(lastPart)) facultyIdent = lastPart
            }
        }

        if (!facultyTitle && !facultyIdent) return null

        return {
            ident: facultyIdent,
            title: facultyTitle,
            // Study plan pages do not expose visibility — defaulting to false;
            // the catalog scraper will update this when it processes the faculty.
            is_schedule_publicly_visible: false
        }
    }

    /**
     * Extracts Semester (ZS/LS) and Year (e.g., 2023/2024).
     */
    private static extractSemesterAndYear($: CheerioAPI): { semester: InSISSemester | null; year: number | null } {
        const periodValue = getRowValueCaseInsensitive($, 'Počáteční období:')
        if (!periodValue) return { semester: null, year: null }

        return {
            semester: extractSemester(periodValue),
            year: extractYear(periodValue)
        }
    }

    /**
     * Extracts ident and title from the plan header row.
     * The ident is identified by an uppercase/number + optional dash pattern;
     * the remainder of the string becomes the title.
     */
    private static extractIdentAndTitle($: CheerioAPI): { ident: string | null; title: string | null } {
        const rawTitle =
            getRowValueCaseInsensitive($, 'Program:')?.trim() ??
            getRowValueCaseInsensitive($, 'Specializace:')?.trim() ??
            cleanText($('ol.breadcrumb').first().text())

        if (!rawTitle) return { ident: null, title: null }

        // Split by any whitespace to handle tabs or non-breaking spaces
        const parts = rawTitle.split(/\s+/)
        let ident: string | null = null

        // Validates the ident format:
        // ^[A-Z0-9]        -> Must start with an uppercase letter or number (no hyphens at start)
        // [A-Z0-9-]{0,19}  -> Followed by up to 19 alphanumerics or hyphens
        // $                -> End of string
        // Matches: B-AIN1, B-IMES, ED, EO, N-EO1, DAB, 4DS, D-EOVE
        // Max length: 20 chars
        const identRegex = /^[A-Z0-9][A-Z0-9-]{0,19}$/
        const candidates = parts.filter(part => identRegex.test(part))

        if (candidates.length > 0) {
            // Sort candidates: Most dashes first.
            // If tied, reverse sort preserves original order (last appearing in string wins).
            candidates.reverse().sort((a, b) => {
                const countA = (a.match(/-/g) ?? []).length
                const countB = (b.match(/-/g) ?? []).length
                return countB - countA
            })

            ident = candidates[0]
        }

        const title: string | null = ident ? serializeValue(rawTitle.split(ident)[1]) : serializeValue(rawTitle)

        return { ident, title }
    }

    /**
     * Extracts all courses listed in the study plan table,
     * grouping them by the nearest group header row above each course row.
     */
    private static extractCourses($: CheerioAPI): ScraperInSISStudyPlanCourse[] {
        const courses: ScraperInSISStudyPlanCourse[] = []
        let currentGroupCode: string | null = null

        $('tr').each((_, row) => {
            const rowEl = $(row)
            const text = cleanText(rowEl.text())

            // Detect group header (e.g., "oP - Povinné předměty")
            const groupMatch = /^([a-z][a-z\d]*)\s+-\s+/i.exec(text)
            if (groupMatch) currentGroupCode = groupMatch[1]

            // Detect course row
            if (rowEl.hasClass('uis-hl-table') && currentGroupCode) {
                const identCell = rowEl.find('td').first()
                const courseIdent = cleanText(identCell.text())
                const anchor = identCell.find('a')
                const href = anchor.attr('href') ?? ''

                if (courseIdent && courseIdent.length >= 3) {
                    const { group, category } = parseGroupCode(currentGroupCode)

                    courses.push({
                        id: ExtractInSISCourseService.extractIdFromUrl(href),
                        url: normalizeUrl(href),
                        ident: courseIdent,
                        group,
                        category
                    })
                }
            }
        })

        return courses
    }
}
