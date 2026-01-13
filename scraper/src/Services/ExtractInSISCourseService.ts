import ScraperInSISCourse, {
    ScraperInSISCourseAssessmentMethod,
    ScraperInSISCourseStudyPlan,
    ScraperInSISCourseTimetableSlot,
    ScraperInSISCourseTimetableUnit
} from '@scraper/Interfaces/ScraperInSISCourse'
import ScraperInSISFaculty from '@scraper/Interfaces/ScraperInSISFaculty'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'
import MarkdownService from '@scraper/Services/MarkdownService'
import { cleanText, getRowValue, getSectionContent, parseMultiLineCell, sanitizeBodyHtml, serializeValue } from '@scraper/Utils/HTMLUtils'
import { extractSemester, extractYear } from '@scraper/Utils/InSISUtils'
import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'

/**
 * Extracts course data from InSIS syllabus pages.
 * Handles metadata, syllabus content, assessments, and timetable parsing.
 */
export default class ExtractInSISCourseService {
    /**
     * Extracts course ID from a syllabus URL.
     */
    static extractIdFromUrl(url: string): number | null {
        const match = /[?&]predmet=(\d+)/.exec(url)
        return match ? parseInt(match[1], 10) : null
    }

    /**
     * Extracts course ID from HTML form input.
     */
    static extractIdFromHtml(html: string): number | null {
        const $ = cheerio.load(html)
        const idInput = $('input[name="predmet"]').attr('value')
        return idInput ? parseInt(idInput, 10) : null
    }

    /**
     * Main extraction method - parses complete course data from syllabus page.
     */
    static extract(html: string, url: string): ScraperInSISCourse {
        const $ = cheerio.load(html)
        sanitizeBodyHtml($)

        const id = this.resolveId($, url)
        const basicInfo = this.extractBasicInfo($)
        const faculty = this.extractFaculty($)
        const levelInfo = this.extractLevelAndYear($)
        const lecturers = this.extractLecturers($)
        const syllabus = this.extractSyllabusContent($)
        const assessmentMethods = this.extractAssessmentMethods($)
        const timetable = this.extractTimetable($)
        const plans = this.extractStudyPlans($)

        return {
            id,
            url,
            url_id: this.extractIdFromUrl(url),
            ...basicInfo,
            faculty,
            ...levelInfo,
            lecturers: lecturers.length > 0 ? lecturers : null,
            ...syllabus,
            assessment_methods: assessmentMethods.length > 0 ? assessmentMethods : null,
            timetable,
            study_plans: plans
        }
    }

    private static resolveId($: CheerioAPI, url: string): number {
        const idInput = $('input[name="predmet"]').attr('value')
        if (idInput) return parseInt(idInput, 10)

        const urlId = this.extractIdFromUrl(url)
        if (urlId !== null) return urlId

        throw new Error('Course ID not found in the HTML content or URL.')
    }

    private static extractBasicInfo($: CheerioAPI) {
        const ident = getRowValue($, 'Kód předmětu:')
        const title = getRowValue($, 'Název v jazyce výuky:') ?? getRowValue($, 'Název česky:')
        const czech_title = getRowValue($, 'Název česky:')

        const ectsRaw = getRowValue($, 'Počet přidělených ECTS kreditů:')
        const ects = ectsRaw ? parseInt(ectsRaw.split(' ')[0], 10) : null

        const mode_of_delivery = getRowValue($, 'Forma výuky kurzu:')?.trim().toLowerCase() ?? null
        const mode_of_completion = getRowValue($, 'Forma ukončení kurzu:')?.trim().toLowerCase() ?? null

        const languagesRaw = getRowValue($, 'Jazyk výuky:')?.trim().toLowerCase() ?? null
        const languages = languagesRaw
            ? languagesRaw
                  .split(', ')
                  .map(l => serializeValue(l.trim()))
                  .filter((l): l is string => l !== null)
            : null

        const semester = getRowValue($, 'Semestr:')?.trim().toUpperCase() ?? null

        return { ident, title, czech_title, ects, mode_of_delivery, mode_of_completion, languages, semester }
    }

    private static extractFaculty($: CheerioAPI): ScraperInSISFaculty {
        const headerText = $('#titulek h1').text() || ''
        const bracketMatch = /\(([^)]+)\)/.exec(headerText)

        if (!bracketMatch) return { ident: null, title: null }

        const facultyIdent = bracketMatch[1].trim().split(' - ')[0]

        if (!facultyIdent) return { ident: null, title: null }

        return { ident: facultyIdent, title: null }
    }

    private static extractLevelAndYear($: CheerioAPI) {
        const levelYearRaw = getRowValue($, 'Doporučený typ a ročník studia:')?.trim().toLowerCase() ?? null
        let level: string | null = null
        let year_of_study: number | null = null

        const isUndefined = !levelYearRaw || levelYearRaw.includes('obsah této položky nebyl definován')

        if (!isUndefined && levelYearRaw) {
            const firstPart = levelYearRaw.split(';')[0].trim()
            const parts = firstPart.split(':')

            if (parts.length > 0) level = serializeValue(parts[0].replace(/\(.*?\)/g, '').trim())

            if (parts.length > 1) {
                const yearMatch = /\d+/.exec(parts[1])
                if (yearMatch) year_of_study = parseInt(yearMatch[0], 10)
            }
        } else {
            // Fallback: infer from page header
            const headerText = $('#titulek h1').text() || ''
            const typeMatch = /-\s*(mba|kurzy|kurz)\s*\)/i.exec(headerText)

            if (typeMatch) {
                const typeRaw = typeMatch[1].toLowerCase()
                if (typeRaw === 'mba') level = 'MBA'
                else if (typeRaw.includes('kurz')) level = 'kurz'
            }
        }

        return { level, year_of_study }
    }

    private static extractLecturers($: CheerioAPI): string[] {
        const lecturers: string[] = []
        const lecturersCell = $('td')
            .filter((_, el) => cleanText($(el).text()).includes('Vyučující:'))
            .next('td')

        if (lecturersCell.length) {
            // Try extracting from anchor tags first
            lecturersCell.find('a').each((_, el) => {
                const name = cleanText($(el).text())
                if (name) lecturers.push(name)
            })

            // Fallback to parsing multi-line cell
            if (lecturers.length === 0) {
                const cell = lecturersCell.get(0)
                if (cell) lecturers.push(...parseMultiLineCell($, cell))
            }
        }

        return lecturers
    }

    private static extractSyllabusContent($: CheerioAPI) {
        const prerequisites = getRowValue($, 'Omezení pro zápis:')
        const recommended_programmes = getRowValue($, 'Doporučené doplňky kurzu:')
        const required_work_experience = getRowValue($, 'Vyžadovaná praxe:')
        const aims_of_the_course = getSectionContent($, 'Zaměření předmětu:')
        const learning_outcomes = getSectionContent($, 'Výsledky učení:')
        const course_contents = getSectionContent($, 'Obsah předmětu:')
        const special_requirements = getSectionContent($, 'Zvláštní podmínky a podrobnosti:') ?? getRowValue($, 'Zvláštní podmínky a podrobnosti:')

        // Literature extraction
        let literature: string | null = null
        const literatureHeaderRow = $('td')
            .filter((_, el) => cleanText($(el).text()).includes('Literatura:'))
            .parent('tr')

        if (literatureHeaderRow.length && literatureHeaderRow.next('tr').length) {
            literature = MarkdownService.formatCheerioElementToMarkdown(literatureHeaderRow.next('tr').find('td'))
        }

        return {
            prerequisites,
            recommended_programmes,
            required_work_experience,
            aims_of_the_course,
            learning_outcomes,
            course_contents,
            special_requirements,
            literature
        }
    }

    private static extractAssessmentMethods($: CheerioAPI): ScraperInSISCourseAssessmentMethod[] {
        const methods: ScraperInSISCourseAssessmentMethod[] = []

        const headerRow = $('td')
            .filter((_, el) => cleanText($(el).text()).includes('Způsoby a kritéria hodnocení'))
            .parent('tr')

        if (!headerRow.length) return methods

        const table = headerRow.next('tr').find('table')
        table.find('tbody tr').each((_, row) => {
            const cols = $(row).find('td')
            if (cols.length < 2) return

            const method = cleanText($(cols[0]).text()) || cleanText($(cols[1]).text())
            const valText = cleanText($(cols).last().text())

            if (method && valText && !method.toLowerCase().includes('celkem')) {
                const weightMatch = /(\d+)/.exec(valText)
                methods.push({
                    method: serializeValue(method),
                    weight: weightMatch ? parseInt(weightMatch[1], 10) : null
                })
            }
        })

        return methods
    }

    private static extractTimetable($: CheerioAPI): ScraperInSISCourseTimetableUnit[] {
        const unitsMap = new Map<string, ScraperInSISCourseTimetableUnit>()

        const header = $('td, b, strong')
            .filter((_, el) => cleanText($(el).text()).includes('Periodické rozvrhové akce'))
            .last()

        if (!header.length) return []

        const table = header.closest('tr').next('tr').find('table')

        table.find('tbody tr').each((_, row) => {
            const cols = $(row).find('td')
            if (cols.length < 7) return

            this.processTimetableRow($, cols as any, unitsMap)
        })

        return Array.from(unitsMap.values())
    }

    private static processTimetableRow($: CheerioAPI, cols: cheerio.Cheerio<Element>, unitsMap: Map<string, ScraperInSISCourseTimetableUnit>): void {
        const colElements = cols.toArray()

        const dayOrDates = parseMultiLineCell($, colElements[0])
        const times = parseMultiLineCell($, colElements[1])
        const locations = parseMultiLineCell($, colElements[2])
        const types = parseMultiLineCell($, colElements[3])
        const frequencies = parseMultiLineCell($, colElements[4])
        const lecturersList = parseMultiLineCell($, colElements[5])
        const capacities = parseMultiLineCell($, colElements[6])
        const noteText = colElements.length > 8 ? cleanText($(colElements[8] as any).text()) : ''

        if (dayOrDates.length === 0) return

        const maxRows = Math.max(dayOrDates.length, times.length, locations.length)

        for (let i = 0; i < maxRows; i++) {
            const currentDayOrDate = dayOrDates[i] || dayOrDates[0] || ''
            const currentTime = times[i] || times[0] || ''
            const currentLocation = locations[i] || locations[0] || ''
            const currentType = types[i] || types[0] || ''
            const currentFreq = frequencies[i] || frequencies[0] || ''
            const currentLecturer = lecturersList[i] || lecturersList[0] || ''
            const currentCapacity = capacities[i] || capacities[0] || '0'
            const capacityInt = parseInt(currentCapacity, 10) || 0

            const key = `${currentLecturer}|${capacityInt}|${noteText}`

            if (!unitsMap.has(key)) {
                unitsMap.set(key, {
                    lecturer: serializeValue(currentLecturer),
                    capacity: capacityInt,
                    note: serializeValue(noteText === '-' ? null : noteText),
                    slots: []
                })
            }

            const slot = this.createTimetableSlot(currentDayOrDate, currentTime, currentLocation, currentType, currentFreq)
            unitsMap.get(key)?.slots?.push(slot)
        }
    }

    private static createTimetableSlot(dayOrDate: string, time: string, location: string, type: string, frequency: string): ScraperInSISCourseTimetableSlot {
        const [time_from, time_to] = time.includes('-') ? time.split('-').map(t => t.trim()) : ['', '']
        const isDate = /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dayOrDate)

        let freq: 'weekly' | 'single' | null = null
        if (frequency.toLowerCase().includes('každý')) freq = 'weekly'
        else if (frequency.toLowerCase().includes('jednoráz') || isDate) freq = 'single'

        return {
            type: serializeValue(type),
            frequency: freq,
            date: isDate ? serializeValue(dayOrDate) : null,
            day: !isDate ? serializeValue(dayOrDate) : null,
            time_from: serializeValue(time_from),
            time_to: serializeValue(time_to),
            location: serializeValue(location)
        }
    }

    /**
     * Extracts study plan references from the course detail tables.
     * Parses the "Fakulta | Kód programu | Forma | Skupina | Období" tables.
     */
    private static extractStudyPlans($: CheerioAPI): ScraperInSISCourseStudyPlan[] {
        const plans: ScraperInSISCourseStudyPlan[] = []

        const tables = $('table.detailni_ramecek').filter((_, el) => {
            const text = $(el).find('th').text()
            return text.includes('Kód programu') && text.includes('Skupina') && text.includes('Období')
        })

        tables.each((_, table) => {
            let lastFaculty: string | null = null

            $(table)
                .find('tbody tr')
                .each((_, row) => {
                    const cells = $(row).find('td')
                    if (cells.length < 4) return

                    let facultyCellIndex = -1
                    let codeIndex = 0
                    let formIndex = 1
                    let groupIndex = 2
                    let periodIndex = 3

                    if (cells.length === 5) {
                        facultyCellIndex = 0
                        codeIndex = 1
                        formIndex = 2
                        groupIndex = 3
                        periodIndex = 4
                        lastFaculty = cleanText($(cells[facultyCellIndex]).text())
                    }

                    const planIdent = cleanText($(cells[codeIndex]).text())
                    const modeOfStudy = cleanText($(cells[formIndex]).text()) // e.g. "prezenční"
                    const groupCode = cleanText($(cells[groupIndex]).text()) // e.g. "cVM", "hP"
                    const periodRaw = $(cells[periodIndex]).html() // Contains <br>

                    if (!planIdent || !periodRaw) return

                    // Parse group code into Study Plan Category and Group
                    // Use the logic from ExtractInSISStudyPlanService
                    const { group, category } = ExtractInSISStudyPlanService.parseGroupCode(groupCode)

                    // Split periods by <br> to create distinct plan entries per semester
                    const periods = periodRaw
                        .split('<br>')
                        .map(p => cleanText(cheerio.load(p).text()))
                        .filter(p => p)

                    periods.forEach(semester => {
                        if (!semester) return

                        const plan: ScraperInSISCourseStudyPlan = {
                            ident: serializeValue(planIdent),
                            facultyIdent: serializeValue(lastFaculty),
                            semester: extractSemester(serializeValue(semester)),
                            year: extractYear(serializeValue(semester)),
                            mode_of_study: serializeValue(modeOfStudy),
                            group: group,
                            category: category
                        }

                        plans.push(plan)
                    })
                })
        })

        return plans
    }
}
