import ScraperInSISFaculty from '@scraper/Interfaces/ScraperInSISFaculty'
import ScraperInSISStudyPlan, { ScraperInSISStudyPlanCourseCategory } from '@scraper/Interfaces/ScraperInSISStudyPlan'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import InSISSemester from '@scraper/Types/InSISSemester'
import InSISStudyPlanCourseCategory from '@scraper/Types/InSISStudyPlanCourseCategory'
import InSISStudyPlanCourseGroup from '@scraper/Types/InSISStudyPlanCourseGroup'
import { cleanText, getRowValueCaseInsensitive, normalizeUrl, serializeValue } from '@scraper/Utils/HTMLUtils'
import { extractSemester, extractYear } from '@scraper/Utils/InSISUtils'
import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'

/**
 * InSIS Group Code Structure:
 *
 * First letter (lowercase) = Group scope:
 *   f* = faculty_specific (fakultně specifické skupiny)
 *   c* = university_wide (celoškolně používané skupiny)
 *   o* = field_specific_bachelor (oborově specifické skupiny - bakalářské)
 *   h* = field_specific_master (oborově specifické skupiny - magisterské)
 *   s* = minor_specialization (skupiny vedlejších specializací)
 *   e* = field_specific_master (extended/doctoral - fallback to master)
 *
 * Suffix (uppercase + numbers) = Category:
 *   *P = compulsory (povinné předměty)
 *   *V[*] = elective (volitelné předměty)
 *   *J[*] = language (jazykově povinně volitelné předměty)
 *   *SZ[*] = state_exam (státní zkoušky)
 *   *EXC = prohibited (zakázaný předmět)
 *   *VOR = beyond_scope (předměty nad rámec studijního plánu)
 *   *ZEXCN* = exchange_program (předměty pro výměnné programy)
 *   *TVS[*] = physical_education (tělesná výchova a sport)
 */

const GroupPrefixes: Record<string, InSISStudyPlanCourseGroup> = {
    f: 'faculty_specific',
    c: 'university_wide',
    o: 'field_specific_bachelor',
    h: 'field_specific_master',
    s: 'minor_specialization',
    e: 'field_specific_master' // Extended/doctoral programs - fallback to master
}

/**
 * Category detection rules - order matters (most specific first)
 */
const CategoryRules: {
    test: (suffix: string) => boolean
    category: InSISStudyPlanCourseCategory
}[] = [
    // *TVS[*] - Tělesná výchova a sport
    { test: suffix => suffix.includes('TVS'), category: 'physical_education' },

    // *SZ[*] - Státní zkoušky
    { test: suffix => suffix.includes('SZ'), category: 'state_exam' },

    // *ZEXCN* - Předměty pro výměnné programy (must check before EXC)
    { test: suffix => suffix.includes('ZEXCN'), category: 'exchange_program' },

    // *EXC - Zakázaný předmět
    { test: suffix => suffix.includes('EXC'), category: 'prohibited' },

    // *VOR - Předměty nad rámec studijního plánu
    { test: suffix => suffix.includes('VOR'), category: 'beyond_scope' },

    // *J[*] - Jazykově povinně volitelné předměty
    // Pattern: suffix starts with J (e.g., J1, J2, JV)
    { test: suffix => /^J\d?/.test(suffix) || suffix === 'JV', category: 'language' },

    // *P - Povinné předměty (strictly ends with P, but not part of other patterns)
    // Must check after TVS, VOR to avoid false matches
    { test: suffix => suffix === 'P' || suffix === 'BP', category: 'compulsory' },

    // *V[*] - Volitelné předměty (contains V but not VOR, TVS, JV)
    { test: suffix => /V\d?$/.test(suffix) || ['VB', 'VM', 'VOL'].some(v => suffix.includes(v)), category: 'elective' }
]

/**
 * Extracts study plan data from InSIS pages.
 * Handles faculty navigation, plan URLs, detailed plan content,
 * and study plan extraction from course pages.
 */
export default class ExtractInSISStudyPlanService {
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
    static extractFacultyUrls(html: string): string[] {
        const $ = cheerio.load(html)
        const urls = new Set<string>()

        $('.vyber-fakult a.fakulta').each((_, el) => {
            const href = $(el).attr('href')
            if (href) urls.add(normalizeUrl(href))
        })

        return [...urls]
    }

    /**
     * Extracts navigation URLs for drilling down into the hierarchy.
     * Excludes final study plan links.
     *
     * @param html - HTML content to parse
     * @param checkForSemesters - If true, filters out semesters older than (current year - 1)
     */
    static extractNavigationUrls(html: string, checkForSemesters = false): string[] {
        const $ = cheerio.load(html)
        const urls = new Set<string>()
        const minYear = new Date().getFullYear() - 1

        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const anchor = $(el).closest('a')
            const href = anchor.attr('href')

            if (!href || href.includes('stud_plan=')) return

            if (checkForSemesters) {
                const rowText = anchor.closest('tr').text()
                const yearMatch = /(\d{4})/.exec(rowText)

                if (yearMatch) {
                    const startYear = parseInt(yearMatch[1], 10)
                    if (startYear < minYear) return
                }
            }

            urls.add(normalizeUrl(href))
        })

        return [...urls]
    }

    /**
     * Extracts final study plan URLs from navigation page.
     */
    static extractPlanUrls(html: string): string[] {
        const $ = cheerio.load(html)
        const urls = new Set<string>()

        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const href = $(el).closest('a').attr('href')
            if (href?.includes('stud_plan=')) {
                urls.add(normalizeUrl(href))
            }
        })

        return [...urls]
    }

    /**
     * Extracts complete study plan details including course categorization.
     */
    static extract(html: string, url: string): ScraperInSISStudyPlan {
        const $ = cheerio.load(html)

        const id = this.extractIdFromUrl(url)
        // If ID is null, we can't form a valid plan object, though typically this would throw or return null
        // depending on strictness. Here we follow the interface which allows ID to be null, or throw if critical.
        if (id === null) console.warn('Study Plan ID not found in the URL:', url)

        // Extract metadata components
        const { ident, title } = this.extractIdentAndTitle($)
        const faculty = this.extractFaculty($)
        const { semester, year } = this.extractSemesterAndYear($)
        const level = getRowValueCaseInsensitive($, 'Typ studia:')?.trim().toLowerCase() ?? null
        const mode_of_study = getRowValueCaseInsensitive($, 'Forma:')?.trim().toLowerCase() ?? null
        const study_length = getRowValueCaseInsensitive($, 'Délka studia:')?.trim().toLowerCase() ?? null

        const courses = this.extractCourses($)

        return {
            id,
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
                if (/^[A-Z0-9]+$/.test(lastPart)) {
                    facultyIdent = lastPart
                }
            }
        }

        if (!facultyTitle && !facultyIdent) return null

        return {
            ident: facultyIdent,
            title: facultyTitle
        }
    }

    /**
     * Extracts Semester (ZS/LS) and Year (e.g., 2023/2024).
     */
    private static extractSemesterAndYear($: CheerioAPI): { semester: InSISSemester | null; year: string | null } {
        const periodValue = getRowValueCaseInsensitive($, 'Počáteční období:')
        if (!periodValue) return { semester: null, year: null }

        return {
            semester: extractSemester(periodValue),
            year: extractYear(periodValue)
        }
    }

    /**
     * Parses an InSIS group code into group scope and category.
     *
     * @param groupCode - The group code (e.g., "oP", "cVB", "fJ1", "hSZ")
     * @returns Object with parsed group and category
     *
     * @example
     * parseGroupCode("oP")    // { group: 'field_specific_bachelor', category: 'compulsory' }
     * parseGroupCode("cVB")   // { group: 'university_wide', category: 'elective' }
     * parseGroupCode("fJ1")   // { group: 'faculty_specific', category: 'language' }
     * parseGroupCode("cTVS1") // { group: 'university_wide', category: 'physical_education' }
     * parseGroupCode("hSZ")   // { group: 'field_specific_master', category: 'state_exam' }
     * parseGroupCode("sP")    // { group: 'minor_specialization', category: 'compulsory' }
     * parseGroupCode("cVM")   // { group: 'university_wide', category: 'elective' }
     * parseGroupCode("oV")    // { group: 'field_specific_bachelor', category: 'elective' }
     * parseGroupCode("hV")    // { group: 'field_specific_master', category: 'elective' }
     * parseGroupCode("sV")    // { group: 'minor_specialization', category: 'elective' }
     * parseGroupCode("eV")    // { group: 'field_specific_master', category: 'elective' }
     */
    static parseGroupCode(groupCode: string): { group: InSISStudyPlanCourseGroup; category: InSISStudyPlanCourseCategory } {
        const group = this.determineGroup(groupCode)
        const category = this.determineCategory(groupCode)
        return { group, category }
    }

    /**
     * Determines the group scope from the first character of the group code.
     */
    static determineGroup(groupCode: string): InSISStudyPlanCourseGroup {
        if (!groupCode || groupCode.length === 0) {
            return 'university_wide' // Default fallback
        }

        const firstChar = groupCode[0].toLowerCase()
        return GroupPrefixes[firstChar] ?? 'university_wide'
    }

    /**
     * Determines the category from the suffix of the group code.
     */
    static determineCategory(groupCode: string): InSISStudyPlanCourseCategory {
        if (!groupCode || groupCode.length < 2) {
            return 'elective' // Default fallback
        }

        // Extract suffix (everything after the first lowercase letter)
        const suffix = groupCode.slice(1).toUpperCase()

        for (const rule of CategoryRules) {
            if (rule.test(suffix)) {
                return rule.category
            }
        }

        // Default to elective if no match
        return 'elective'
    }

    private static extractIdentAndTitle($: CheerioAPI): { ident: string | null; title: string | null } {
        const rawTitle =
            getRowValueCaseInsensitive($, 'Program:')?.trim() ?? getRowValueCaseInsensitive($, 'Specializace:')?.trim() ?? cleanText($('h2').first().text())

        let ident: string | null = null
        const title: string | null = serializeValue(rawTitle)

        if (rawTitle) {
            const parts = rawTitle.split(' ')
            if (parts.length > 0 && /^[A-Z0-9-]+$/.test(parts[0])) {
                ident = parts[0]
            }
        }

        return { ident, title }
    }

    private static extractCourses($: CheerioAPI): ScraperInSISStudyPlanCourseCategory[] {
        const courses: ScraperInSISStudyPlanCourseCategory[] = []
        let currentGroupCode: string | null = null

        $('tr').each((_, row) => {
            const rowEl = $(row)
            const text = cleanText(rowEl.text())

            // Detect group header (e.g., "oP - Povinné předměty")
            const groupMatch = /^([a-zA-Z][a-zA-Z0-9]*)\s+-\s+/.exec(text)
            if (groupMatch) {
                currentGroupCode = groupMatch[1]
            }

            // Detect course row
            if (rowEl.hasClass('uis-hl-table') && currentGroupCode) {
                const identCell = rowEl.find('td').first()
                const courseIdent = cleanText(identCell.text())
                const anchor = identCell.find('a')
                const href = anchor.attr('href') ?? ''

                if (courseIdent && courseIdent.length >= 3) {
                    const { group, category } = this.parseGroupCode(currentGroupCode)

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
