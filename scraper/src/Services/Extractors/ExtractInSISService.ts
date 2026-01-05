import ScraperInSISCourse, { ScraperInSISCourseAssessmentMethod, ScraperInSISCourseTimetableUnit } from '@scraper/Interfaces/ScraperInSISCourse'
import ScraperInSISStudyPlan, { ScraperInSISStudyPlanCourseCategory } from '@scraper/Interfaces/ScraperInSISStudyPlan'
import ExtractService from '@scraper/Services/Extractors/ExtractService'
import MarkdownService from '@scraper/Services/MarkdownService'
import * as cheerio from 'cheerio'

/**
 * Service responsible for parsing HTML content from the InSIS university system.
 * Extracts course catalog lists, detailed course syllabi, and study plans.
 */
export default class ExtractInSISService {
    private static readonly BASE_DOMAIN = 'https://insis.vse.cz'
    private static readonly BASE_CATALOG_URL = 'https://insis.vse.cz/katalog/'

    /**
     * Generates base HTTP headers for requests to InSIS.
     * @param referer - The Referer header value. Defaults to the main InSIS page.
     */
    static baseRequestHeaders(referer = 'https://insis.vse.cz') {
        return {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: referer,
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
    }

    private static normalizeUrl(href: string): string {
        if (href.startsWith('http')) return href
        if (href.startsWith('/')) return this.BASE_DOMAIN + href
        return this.BASE_CATALOG_URL + href
    }

    /**
     * Parses the "Extended Search" form to extract available Faculties and Academic Periods.
     * Filters for Academic Years starting from 2025 (covering ZS/LS 2025/2026) and future years.
     */
    static extractCatalogSearchOptions(html: string) {
        const $ = cheerio.load(html)
        const faculties: { id: number; name: string }[] = []
        const periods: { id: number; name: string }[] = []

        const minYear = new Date().getFullYear() - 1

        const cleanText = (text: string | null): string => {
            return text
                ? text
                      .replace(/\u00A0|&nbsp;/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                : ''
        }

        $('td#fakulty input[name="fakulta"]').each((_, el) => {
            const id = $(el).val() as string
            const nextNode = el.nextSibling

            const rawName = nextNode?.type === 'text' ? nextNode.data : $(el).parent().text()
            const name = cleanText(rawName)

            if (id && name) {
                faculties.push({ id: Number(id.trim()), name: name.toLowerCase() })
            }
        })

        $('input[name="obdobi_fak"]').each((_, el) => {
            const id = $(el).val() as string
            const nextNode = el.nextSibling

            const rowText = cleanText(nextNode?.type === 'text' ? nextNode.data : $(el).parent().text())
            const name = cleanText(rowText)

            // Extract the first 4-digit year found in the row
            const yearMatch = /(\d{4})/.exec(rowText)

            if (yearMatch && id && name) {
                const startYear = parseInt(yearMatch[1], 10)

                if (startYear >= minYear) {
                    periods.push({ id: Number(id.trim()), name: name.toUpperCase() })
                }
            }
        })

        return { faculties, periods }
    }

    /**
     * Extracts a unique list of course syllabus URLs from the catalog page.
     */
    static extractCatalog(html: string): string[] {
        const $ = cheerio.load(html)
        const subjects: string[] = []

        $('a[href*="syllabus.pl?predmet="]').each((_, el) => {
            const href = $(el).attr('href')
            if (href) {
                const fullUrl = href.startsWith('http') ? href : this.BASE_CATALOG_URL + href
                subjects.push(fullUrl.trim().split(';')[0])
            }
        })

        return [...new Set(subjects)]
    }

    static extractCourseIdFromURL(url: string): number | null {
        const idMatch = /[?&]predmet=(\d+)/.exec(url)
        return idMatch ? parseInt(idMatch[1], 10) : null
    }

    static extractCourseIdFromHTML(html: string): number | null {
        const $ = cheerio.load(html)
        const idInput = $('input[name="predmet"]').attr('value')
        return idInput ? parseInt(idInput, 10) : null
    }

    /**
     * Parses the detailed course page to extract metadata, syllabus, assessments, and timetable.
     * @param html - Raw HTML content.
     * @param url - Source URL (fallback for ID extraction).
     * @param faculty - Faculty code associated with the course.
     */
    static extractCourse(html: string, url: string, faculty: string | null): ScraperInSISCourse {
        const $ = cheerio.load(html)
        const body = $('body')

        if (body.length) {
            body.html(body.html()?.replace(/&nbsp;/g, ' ') ?? '')
        }

        const cleanText = (text: string | null): string => {
            return text
                ? text
                      .replace(/\u00A0|&nbsp;/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                : ''
        }

        const getRowValue = (targetLabel: string): string | null => {
            const cleanTarget = cleanText(targetLabel)
            const labelCell = $('td')
                .filter((_, el) => cleanText($(el).text()).includes(cleanTarget))
                .first()

            if (labelCell.length && labelCell.next('td').length) {
                return ExtractService.serializeValue(cleanText(labelCell.next('td').text()))
            }
            return null
        }

        const getSectionContent = (headerText: string): string | null => {
            const cleanHeader = cleanText(headerText)
            const headerRow = $('td')
                .filter((_, el) => cleanText($(el).text()).includes(cleanHeader))
                .parent('tr')

            if (headerRow.length && headerRow.next('tr').length) {
                return MarkdownService.formatCheerioElementToMarkdown(headerRow.next('tr').find('td'))
            }
            return null
        }

        const parseMultiLineCell = (element: any): string[] => {
            const htmlContent = $(element).html()
            if (!htmlContent) return []
            return htmlContent
                .split(/<br\s*\/?>/i)
                .map(part => cleanText(cheerio.load(part).text()))
                .filter(part => part.length > 0)
        }

        let id: number | null = null
        const idInput = $('input[name="predmet"]').attr('value')
        if (idInput) {
            id = parseInt(idInput, 10)
        } else if (url) {
            id = this.extractCourseIdFromURL(url)
        }

        if (id === null) throw new Error('Course ID not found in the HTML content or URL.')

        const ident = getRowValue('Kód předmětu:')
        const title = getRowValue('Název v jazyce výuky:') ?? getRowValue('Název česky:')
        const czech_title = getRowValue('Název česky:')

        const ectsRaw = getRowValue('Počet přidělených ECTS kreditů:')
        const ects = ectsRaw ? parseInt(ectsRaw.split(' ')[0], 10) : null

        const mode_of_delivery = getRowValue('Forma výuky kurzu:')?.trim().toLowerCase() ?? null
        const mode_of_completion = getRowValue('Forma ukončení kurzu:')?.trim().toLowerCase() ?? null

        const languagesRaw = getRowValue('Jazyk výuky:')?.trim().toLowerCase() ?? null
        const languages = languagesRaw
            ? languagesRaw
                  .split(', ')
                  .map(l => ExtractService.serializeValue(l.trim()))
                  .filter(l => l !== null)
            : null

        const semester = getRowValue('Semestr:')?.trim().toUpperCase() ?? null

        // Level & Year Extraction
        const levelYearRaw = getRowValue('Doporučený typ a ročník studia:')?.trim().toLowerCase() ?? null
        let level: string | null = null
        let year_of_study: number | null = null
        const isUndefined = !levelYearRaw || levelYearRaw.includes('obsah této položky nebyl definován')

        if (!isUndefined && levelYearRaw) {
            const firstPart = levelYearRaw.split(';')[0].trim()
            const parts = firstPart.split(':')
            if (parts.length > 0) {
                level = ExtractService.serializeValue(parts[0].replace(/\(.*?\)/g, '').trim())
            }
            if (parts.length > 1) {
                const yearMatch = /\d+/.exec(parts[1])
                if (yearMatch) year_of_study = parseInt(yearMatch[0], 10)
            }
        } else {
            // Fallback inference from header
            const headerText = $('#titulek h1').text() || ''
            const typeMatch = /-\s*(mba|kurzy|kurz)\s*\)/i.exec(headerText)
            if (typeMatch) {
                const typeRaw = typeMatch[1].toLowerCase()
                if (typeRaw === 'mba') level = 'MBA'
                else if (typeRaw.includes('kurz')) level = 'kurz'
            }
        }

        // Lecturers
        const lecturers: string[] = []
        const lecturersCell = $('td')
            .filter((_, el) => cleanText($(el).text()).includes('Vyučující:'))
            .next('td')

        if (lecturersCell.length) {
            lecturersCell.find('a').each((_, el) => {
                const name = cleanText($(el).text())
                if (name) lecturers.push(name)
            })
            if (lecturers.length === 0) {
                lecturers.push(...parseMultiLineCell(lecturersCell))
            }
        }

        // Course Details
        const prerequisites = getRowValue('Omezení pro zápis:')
        const recommended_programmes = getRowValue('Doporučené doplňky kurzu:')
        const required_work_experience = getRowValue('Vyžadovaná praxe:')
        const aims_of_the_course = getSectionContent('Zaměření předmětu:')
        const learning_outcomes = getSectionContent('Výsledky učení:')
        const course_contents = getSectionContent('Obsah předmětu:')
        const special_requirements = getSectionContent('Zvláštní podmínky a podrobnosti:') ?? getRowValue('Zvláštní podmínky a podrobnosti:')

        // Literature
        let literature: string | null = null
        const literatureHeaderRow = $('td')
            .filter((_, el) => cleanText($(el).text()).includes('Literatura:'))
            .parent('tr')
        if (literatureHeaderRow.length && literatureHeaderRow.next('tr').length) {
            literature = MarkdownService.formatCheerioElementToMarkdown(literatureHeaderRow.next('tr').find('td'))
        }

        // Assessment Methods
        const assessment_methods: ScraperInSISCourseAssessmentMethod[] = []
        const assessmentHeaderRow = $('td')
            .filter((_, el) => cleanText($(el).text()).includes('Způsoby a kritéria hodnocení'))
            .parent('tr')

        if (assessmentHeaderRow.length) {
            const table = assessmentHeaderRow.next('tr').find('table')
            table.find('tbody tr').each((_, row) => {
                const cols = $(row).find('td')
                if (cols.length >= 2) {
                    const method = cleanText($(cols[0]).text()) || cleanText($(cols[1]).text())
                    const valText = cleanText($(cols).last().text())

                    if (method && valText && !method.toLowerCase().includes('celkem')) {
                        const weightMatch = /(\d+)/.exec(valText)
                        assessment_methods.push({
                            method: ExtractService.serializeValue(method),
                            weight: weightMatch ? parseInt(weightMatch[1], 10) : null
                        })
                    }
                }
            })
        }

        // Timetable Parsing
        const timetableUnitsMap = new Map<string, ScraperInSISCourseTimetableUnit>()
        const timetableHeader = $('td, b, strong')
            .filter((_, el) => cleanText($(el).text()).includes('Periodické rozvrhové akce'))
            .last()

        if (timetableHeader.length) {
            const table = timetableHeader.closest('tr').next('tr').find('table')

            table.find('tbody tr').each((_, row) => {
                const cols = $(row).find('td')
                if (cols.length >= 7) {
                    const dayOrDates = parseMultiLineCell(cols[0])
                    const times = parseMultiLineCell(cols[1])
                    const locations = parseMultiLineCell(cols[2])
                    const types = parseMultiLineCell(cols[3])
                    const frequencies = parseMultiLineCell(cols[4])
                    const lecturersList = parseMultiLineCell(cols[5])
                    const capacities = parseMultiLineCell(cols[6])
                    const noteText = cols.length > 8 ? cleanText($(cols[8]).text()) : ''

                    if (dayOrDates.length === 0) return

                    const maxRows = Math.max(dayOrDates.length, times.length, locations.length)

                    for (let k = 0; k < maxRows; k++) {
                        const currentDayOrDate = dayOrDates[k] || dayOrDates[0] || ''
                        const currentTime = times[k] || times[0] || ''
                        const currentLocation = locations[k] || locations[0] || ''
                        const currentType = types[k] || types[0] || ''
                        const currentFreq = frequencies[k] || frequencies[0] || ''
                        const currentLecturer = lecturersList[k] || lecturersList[0] || ''
                        const currentCapacity = capacities[k] || capacities[0] || '0'
                        const capacityInt = parseInt(currentCapacity, 10) || 0

                        const key = `${currentLecturer}|${capacityInt}|${noteText}`

                        if (!timetableUnitsMap.has(key)) {
                            timetableUnitsMap.set(key, {
                                lecturer: ExtractService.serializeValue(currentLecturer),
                                capacity: capacityInt,
                                note: ExtractService.serializeValue(noteText === '-' ? null : noteText),
                                slots: []
                            })
                        }

                        const unit = timetableUnitsMap.get(key)
                        const [time_from, time_to] = currentTime.includes('-') ? currentTime.split('-').map(t => t.trim()) : ['', '']
                        const isDate = /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(currentDayOrDate)

                        let frequency: 'weekly' | 'single' | null = null
                        if (currentFreq.toLowerCase().includes('každý')) frequency = 'weekly'
                        else if (currentFreq.toLowerCase().includes('jednoráz') || isDate) frequency = 'single'

                        unit?.slots?.push({
                            type: ExtractService.serializeValue(currentType),
                            frequency,
                            date: isDate ? ExtractService.serializeValue(currentDayOrDate) : null,
                            day: !isDate ? ExtractService.serializeValue(currentDayOrDate) : null,
                            time_from: ExtractService.serializeValue(time_from),
                            time_to: ExtractService.serializeValue(time_to),
                            location: ExtractService.serializeValue(currentLocation)
                        })
                    }
                }
            })
        }

        return {
            id,
            url,
            url_id: this.extractCourseIdFromURL(url),
            ident,
            title,
            czech_title,
            ects,
            faculty,
            mode_of_delivery,
            mode_of_completion,
            languages,
            level,
            year_of_study,
            semester,
            lecturers: lecturers.length > 0 ? lecturers : null,
            prerequisites,
            recommended_programmes,
            required_work_experience,
            aims_of_the_course,
            learning_outcomes,
            course_contents,
            assessment_methods: assessment_methods.length > 0 ? assessment_methods : null,
            special_requirements,
            literature,
            timetable: Array.from(timetableUnitsMap.values())
        }
    }

    /**
     * Extracts Faculty URLs from the Study Plans Overview page.
     */
    static extractStudyPlansFacultyURLs(html: string): string[] {
        const $ = cheerio.load(html)
        const urls: string[] = []
        $('.vyber-fakult a.fakulta').each((_, el) => {
            const href = $(el).attr('href')
            if (href) urls.push(this.normalizeUrl(href))
        })
        return [...new Set(urls)]
    }

    /**
     * Extracts URLs that drill down deeper into the hierarchy (Programs, Obors, Specializations),
     * excluding final Study Plan links.
     * @param html - The HTML content to parse.
     * @param checkForSemesters - If true, filters out semesters older than (Current Year - 1).
     */
    static extractNavigationURLs(html: string, checkForSemesters = false): string[] {
        const $ = cheerio.load(html)
        const urls: string[] = []

        const minYear = new Date().getFullYear() - 1

        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const anchor = $(el).closest('a')
            const href = anchor.attr('href')

            if (href && !href.includes('stud_plan=')) {
                let isValid = true

                if (checkForSemesters) {
                    // Traverse up to the row to find the text (e.g., "ZS 2025/2026")
                    const row = anchor.closest('tr')
                    const rowText = row.text()

                    // Extract the first 4-digit year found in the row
                    const yearMatch = /(\d{4})/.exec(rowText)

                    if (yearMatch) {
                        const startYear = parseInt(yearMatch[1], 10)

                        if (startYear < minYear) {
                            isValid = false
                        }
                    }
                }

                if (isValid) {
                    urls.push(this.normalizeUrl(href))
                }
            }
        })

        return [...new Set(urls)]
    }

    /**
     * Parses the page to find final Study Plan URLs.
     */
    static extractStudyPlanURLs(html: string): string[] {
        const $ = cheerio.load(html)

        const urls: string[] = []

        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const href = $(el).closest('a').attr('href')

            if (href?.includes('stud_plan=')) {
                urls.push(this.normalizeUrl(href))
            }
        })

        return [...new Set(urls)]
    }

    static extractStudyPlanIdFromURL(url: string): number | null {
        const idRaw = /stud_plan=(\d+)/.exec(url)?.[1]
        return idRaw ? parseInt(idRaw, 10) : null
    }

    /**
     * Extracts details from the study plan, categorizing subjects based on InSIS codes.
     */
    static extractStudyPlan(html: string, url: string): ScraperInSISStudyPlan {
        const $ = cheerio.load(html)

        const cleanText = (text: string | null): string => {
            return text
                ? text
                      .replace(/\u00A0|&nbsp;/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                : ''
        }

        const getRowValue = (targetLabel: string): string | null => {
            const cleanTarget = cleanText(targetLabel).toLowerCase()
            let foundValue: string | null = null

            $('td').each((_, el) => {
                const cellText = cleanText($(el).text()).toLowerCase()
                if (cellText.includes(cleanTarget) && !foundValue) {
                    const nextCell = $(el).next('td')
                    if (nextCell.length) foundValue = cleanText(nextCell.text())
                }
            })
            return ExtractService.serializeValue(foundValue)
        }

        const id = this.extractStudyPlanIdFromURL(url)
        if (id === null) throw new Error('Study Plan ID not found in the URL.')

        const faculty = getRowValue('Fakulta:')?.trim().toLowerCase().split(' (')[0] ?? null
        const semester = getRowValue('Počáteční období:')?.trim().split(' - ')[0].toUpperCase() ?? null
        const level = getRowValue('Typ studia:')?.trim().toLowerCase() ?? null
        const mode_of_study = getRowValue('Forma:')?.trim().toLowerCase() ?? null
        const study_length = getRowValue('Délka studia:')?.trim().toLowerCase() ?? null

        const rawTitle = getRowValue('Program:')?.trim() ?? getRowValue('Specializace:')?.trim() ?? cleanText($('h2').first().text())

        let ident: string | null = null
        const title: string | null = ExtractService.serializeValue(rawTitle)

        if (rawTitle) {
            const parts = rawTitle.split(' ')
            if (parts.length > 0 && /^[A-Z0-9-]+$/.test(parts[0])) {
                ident = parts[0]
            }
        }

        const courses: ScraperInSISStudyPlanCourseCategory[] = []
        let currentGroupCode: string | null = null

        $('tr').each((_, row) => {
            const rowEl = $(row)
            const text = cleanText(rowEl.text())

            // Detect Group Header
            const groupMatch = /^([a-zA-Z0-9]+)\s+-\s+/.exec(text)
            if (groupMatch) {
                currentGroupCode = groupMatch[1]
            }

            // Detect Course Row
            if (rowEl.hasClass('uis-hl-table')) {
                const identCell = rowEl.find('td').first()
                const courseIdent = cleanText(identCell.text())
                const anchor = identCell.find('a')
                const courseId = this.extractCourseIdFromURL(anchor.attr('href') ?? '')
                const courseUrl = this.normalizeUrl(anchor.attr('href') ?? '')

                if (courseIdent && courseIdent.length >= 3 && currentGroupCode) {
                    let category: ScraperInSISStudyPlanCourseCategory['category'] = 'optional'

                    if (currentGroupCode.startsWith('cTVS')) category = 'physical_education'
                    else if (/^[of]J|^sK/.test(currentGroupCode)) category = 'language'
                    else if (currentGroupCode.includes('SZ')) category = 'state_exam'
                    else if (['cVM', 'cVD', 'cVP', 'cVV'].includes(currentGroupCode)) category = 'general_elective'
                    else if (
                        currentGroupCode.endsWith('P') ||
                        currentGroupCode === 'oBP' ||
                        ['oP', 'hP', 'sP', 'fP', 'eP'].some(p => currentGroupCode?.startsWith(p))
                    )
                        category = 'compulsory'
                    else if (currentGroupCode.includes('V') || ['oV', 'hV', 'sV', 'fV', 'eV'].some(p => currentGroupCode?.startsWith(p))) category = 'elective'

                    courses.push({ id: courseId, url: courseUrl, ident: courseIdent, category })
                }
            }
        })

        return {
            id,
            url,
            ident,
            title,
            faculty,
            semester,
            level,
            mode_of_study,
            study_length,
            courses: courses.length > 0 ? courses : null
        }
    }
}
