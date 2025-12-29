import ScraperInSISCourse, { ScraperInSISCourseAssessmentMethod, ScraperInSISCourseTimetableUnit } from '@scraper/Interfaces/ScraperInSISCourse'
import ScraperInSISStudyPlan, { ScraperInSISStudyPlanCourseCategory } from '@scraper/Interfaces/ScraperInSISStudyPlan'
import ExtractService from '@scraper/Services/Extractors/ExtractService'
import MarkdownService from '@scraper/Services/MarkdownService'
import * as cheerio from 'cheerio'

/**
 * Service responsible for parsing HTML content from the InSIS university system.
 * Extracts course catalog lists and detailed course syllabi/timetables.
 */
export default class ExtractInSISService {
    private static baseDomain = 'https://insis.vse.cz'
    private static baseCatalogUrl = 'https://insis.vse.cz/katalog/'

    /**
     * Generates base HTTP headers for requests to InSIS.
     *
     * @param referer - The Referer header value to use. Defaults to the main InSIS page.
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
        if (href.startsWith('http')) {
            return href
        }
        if (href.startsWith('/')) {
            return this.baseDomain + href
        }
        // Handle path-relative (rare in these specific pages, but safe)
        return this.baseCatalogUrl + href
    }

    /**
     * Parses the "Extended Search" form to extract available Faculties and Academic Periods.
     * Used to dynamically build search queries.
     *
     * @param html - The raw HTML of the /katalog/index.pl?jak=rozsirene page.
     */
    static extractCatalogSearchOptions(html: string) {
        const $ = cheerio.load(html)

        const cleanText = (text: string | null): string => {
            if (!text) return ''
            return text
                .replace(/\u00A0/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
        }

        const faculties: { id: number; name: string }[] = []
        const periods: { id: number; name: string }[] = []

        $('td#fakulty input[name="fakulta"]').each((_, el) => {
            const id = $(el).val() as string

            // Get the text node immediately following the input element
            const nextNode = el.nextSibling
            let name = ''

            if (nextNode?.type === 'text') {
                name = cleanText(nextNode.data)
            } else {
                // Fallback if structure varies slightly
                name = cleanText($(el).parent().text())
            }

            if (id && name) {
                faculties.push({
                    id: Number(id.trim()),
                    name: name.trim().toLowerCase()
                })
            }
        })

        $('input[name="obdobi"]').each((_, el) => {
            const id = $(el).val() as string

            const nextNode = el.nextSibling
            let name = ''

            if (nextNode?.type === 'text') {
                name = cleanText(nextNode.data)
            } else {
                name = cleanText($(el).parent().text())
            }

            if (id && name) {
                periods.push({
                    id: Number(id.trim()),
                    name: name.trim().toUpperCase()
                })
            }
        })

        return { faculties, periods }
    }

    /**
     * Parses the course catalog HTML to extract a unique list of course syllabus URLs.
     * Identifies links based on the specific `syllabus.pl?predmet=` pattern.
     *
     * @param html - The raw HTML content of the catalog page.
     * @returns An object containing a deduplicated list of absolute course URLs.
     */
    static extractCatalog(html: string): string[] {
        const $ = cheerio.load(html)
        const subjects: string[] = []

        $('a[href*="syllabus.pl?predmet="]').each((i, el) => {
            const href = $(el).attr('href')

            if (href) {
                const fullUrl = href.startsWith('http') ? href : this.baseCatalogUrl + href
                subjects.push(fullUrl.trim().split(';')[0])
            }
        })

        return [...new Set(subjects)]
    }

    static extractCourseIdFromURL(url: string): number | null {
        const idMatch = /[?&]predmet=(\d+)/.exec(url)
        if (idMatch) {
            return parseInt(idMatch[1], 10)
        }
        return null
    }

    static extractCourseIdFromHTML(html: string): number | null {
        const $ = cheerio.load(html)
        const idInput = $('input[name="predmet"]').attr('value')

        if (idInput) {
            return parseInt(idInput, 10)
        }
        return null
    }

    /**
     * Parses the detailed HTML page of a specific course.
     * Extracts metadata (ECTS, language, level), syllabus sections (Markdown), assessment methods, and timetable slots.
     * Handles text cleaning, entity decoding, and complex timetable row grouping.
     *
     * @param html - The raw HTML content of the course detail page.
     * @param url - The source URL of the page (used as a fallback for ID extraction).
     * @param faculty - The faculty/department code associated with the course.
     * @returns The structured course data object.
     * @throws {Error} If the unique Course ID cannot be determined from the content or URL.
     */
    static extractCourse(html: string, url: string, faculty: string | null): ScraperInSISCourse {
        const $ = cheerio.load(html)

        const body = $('body')
        if (body.length) {
            body.html(body.html()?.replace(/&nbsp;/g, ' ') ?? '')
        }

        const cleanText = (text: string | null): string => {
            if (!text) return ''
            return text
                .replace(/\u00A0/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
        }

        const getRowValue = (targetLabel: string): string | null => {
            const cleanTarget = cleanText(targetLabel)

            const labelCell = $('td')
                .filter((_, el) => {
                    const cellText = cleanText($(el).text())
                    return cellText.includes(cleanTarget)
                })
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
                const contentCell = headerRow.next('tr').find('td')
                return MarkdownService.formatCheerioElementToMarkdown(contentCell)
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

        if (id === null) {
            throw new Error('Course ID not found in the HTML content or URL.')
        }

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
                  .map(lang => ExtractService.serializeValue(lang.trim()))
                  .filter(lang => lang !== null)
            : null

        const semester = getRowValue('Semestr:')?.trim().toUpperCase() ?? null

        // Logic to extract academic level and year (e.g., "Bachelor", "Year 2")
        const levelYearRaw = getRowValue('Doporučený typ a ročník studia:')?.trim().toLowerCase() ?? null
        let level: string | null = null
        let year_of_study: number | null = null

        const isUndefined = !levelYearRaw || levelYearRaw.includes('obsah této položky nebyl definován')

        if (!isUndefined && levelYearRaw) {
            const firstPart = levelYearRaw.split(';')[0].trim()
            const parts = firstPart.split(':')

            if (parts.length > 0) {
                const cleanLevel = parts[0].replace(/\(.*?\)/g, '').trim()
                level = ExtractService.serializeValue(cleanLevel)
            }

            if (parts.length > 1) {
                const yearMatch = /\d+/.exec(parts[1])
                if (yearMatch) {
                    year_of_study = parseInt(yearMatch[0], 10)
                }
            }
        } else {
            // Fallback: Attempt to infer level from the page header (e.g., MBA or specific courses).
            const headerText = $('#titulek h1').text() || ''

            const typeMatch = /-\s*(mba|kurzy|kurz)\s*\)/i.exec(headerText)

            if (typeMatch) {
                const typeRaw = typeMatch[1].toLowerCase()
                if (typeRaw === 'mba') {
                    level = 'MBA'
                } else if (typeRaw.includes('kurz')) {
                    level = 'kurz'
                }
            }
        }

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
                const names = parseMultiLineCell(lecturersCell)
                lecturers.push(...names)
            }
        }

        const prerequisites = getRowValue('Omezení pro zápis:')
        const recommended_programmes = getRowValue('Doporučené doplňky kurzu:')
        const required_work_experience = getRowValue('Vyžadovaná praxe:')

        const aims_of_the_course = getSectionContent('Zaměření předmětu:')
        const learning_outcomes = getSectionContent('Výsledky učení:')
        const course_contents = getSectionContent('Obsah předmětu:')
        const special_requirements = getSectionContent('Zvláštní podmínky a podrobnosti:') ?? getRowValue('Zvláštní podmínky a podrobnosti:')

        let literature: string | null = null
        const literatureHeaderRow = $('td')
            .filter((_, el) => cleanText($(el).text()).includes('Literatura:'))
            .parent('tr')

        if (literatureHeaderRow.length && literatureHeaderRow.next('tr').length) {
            const litContent = literatureHeaderRow.next('tr').find('td')
            literature = MarkdownService.formatCheerioElementToMarkdown(litContent)
        }

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

                        const dateVal = isDate ? ExtractService.serializeValue(currentDayOrDate) : null
                        const dayVal = !isDate ? ExtractService.serializeValue(currentDayOrDate) : null

                        unit?.slots?.push({
                            type: ExtractService.serializeValue(currentType),
                            frequency,
                            date: dateVal,
                            day: dayVal,
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
     * Parses the "Prohlídka studijních programů" (Study Plans Overview) page.
     * Extracts the URLs for specific faculties/departments.
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
     * GENERIC NAVIGATION EXTRACTOR
     * Extracts URLs that drill down deeper into the hierarchy (Programs, Obors, Specializations),
     * BUT excludes final Study Plan links.
     * * Handles variable depth found in OZS, CESP, etc.
     */
    static extractNavigationURLs(html: string): string[] {
        const $ = cheerio.load(html)
        const urls: string[] = []

        // Target the "Prohlížet" (Browse) icon
        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const anchor = $(el).closest('a')
            const href = anchor.attr('href')

            if (href) {
                // If it contains 'stud_plan=', it is a LEAF (Plan), not a NODE (Navigation).
                // We skip leaves here.
                if (!href.includes('stud_plan=')) {
                    urls.push(this.normalizeUrl(href))
                }
            }
        })

        return [...new Set(urls)]
    }

    /**
     * Parses the page (at any depth) to find final Study Plan URLs.
     * Identified by the presence of the `stud_plan=` query parameter.
     */
    static extractStudyPlanURLs(html: string): string[] {
        const $ = cheerio.load(html)
        const urls: string[] = []

        // We look for the "Prohlížet" (Browse) icon
        $('span[data-sysid="prohlizeni-info"]').each((_, el) => {
            const anchor = $(el).closest('a')
            const href = anchor.attr('href')

            // The presence of 'stud_plan=' confirms this is the final link
            if (href?.includes('stud_plan=')) {
                urls.push(this.normalizeUrl(href))
            }
        })

        return [...new Set(urls)]
    }

    /**
     * Extracts the unique Study Plan ID from the given URL.
     *
     * @param url - The URL containing the `stud_plan` query parameter.
     * @returns The extracted Study Plan ID as a number, or null if not found.
     */
    static extractStudyPlanIdFromURL(url: string): number | null {
        let id: number | null = null

        const idRaw = /stud_plan=(\d+)/.exec(url)?.[1] ?? null
        if (idRaw) id = parseInt(idRaw, 10)

        return id
    }

    // /**
    //  * Parses the study plan page to extract all course syllabus URLs listed within that plan.
    //  *
    //  * @param html - The raw HTML content of the study plan page.
    //  * @returns An array of absolute URLs leading to each course syllabus in the plan.
    //  */
    // static extractStudyPlanCourses(html: string): string[] {
    //     const $ = cheerio.load(html)
    //     const subjects: string[] = []
    //
    //     $('a[href*="../katalog/syllabus.pl?predmet="]').each((i, el) => {
    //         const href = $(el).attr('href')
    //
    //         if (href) {
    //             const fullUrl = this.baseCatalogUrl + href.replace('../katalog/', '')
    //
    //             subjects.push(fullUrl.trim().split(';')[0])
    //         }
    //     })
    //
    //     return [...new Set(subjects)]
    // }

    /**
     * Extracts details from the study plan.
     * Automatically detects groups of subjects according to InSIS codes (e.g., oP, hP, cTVS)
     * and assigns them a specific category within a single courses array.
     */
    static extractStudyPlan(html: string, url: string): ScraperInSISStudyPlan {
        const $ = cheerio.load(html)

        const cleanText = (text: string | null): string => {
            if (!text) return ''
            return text
                .replace(/\u00A0/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
        }

        const getRowValue = (targetLabel: string): string | null => {
            const cleanTarget = cleanText(targetLabel).toLowerCase()
            let foundValue: string | null = null

            $('td').each((_, el) => {
                const cellText = cleanText($(el).text()).toLowerCase()
                if (cellText.includes(cleanTarget) && !foundValue) {
                    const nextCell = $(el).next('td')
                    if (nextCell.length) {
                        foundValue = cleanText(nextCell.text())
                    }
                }
            })
            return ExtractService.serializeValue(foundValue)
        }

        const id = this.extractStudyPlanIdFromURL(url)
        if (id === null) {
            throw new Error('Study Plan ID not found in the URL.')
        }

        const faculty = getRowValue('Fakulta:')?.trim().toLowerCase().split(' (')[0] ?? null
        const semester = getRowValue('Počáteční období:')?.trim().split(' - ')[0].toUpperCase() ?? null
        const level = getRowValue('Typ studia:')?.trim().toLowerCase() ?? null
        const mode_of_study = getRowValue('Forma:')?.trim().toLowerCase() ?? null
        const study_length = getRowValue('Délka studia:')?.trim().toLowerCase() ?? null

        let rawTitle = getRowValue('Program:')?.trim() ?? null
        rawTitle ??= getRowValue('Specializace:')?.trim() ?? null
        rawTitle ??= cleanText($('h2').first().text())

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

            // 1. Detect Group Header (e.g., "oP - Povinné předměty")
            const groupMatch = /^([a-zA-Z0-9]+)\s+-\s+/.exec(text)
            if (groupMatch) {
                currentGroupCode = groupMatch[1]
            }

            // 2. Detect Course Row
            if (rowEl.hasClass('uis-hl-table')) {
                const identCell = rowEl.find('td').first()
                const courseIdent = cleanText(identCell.text())
                const courseId = this.extractCourseIdFromURL(identCell.find('a').attr('href') ?? '')
                const courseUrl = this.normalizeUrl(identCell.find('a').attr('href') ?? '')

                if (courseIdent && courseIdent.length >= 3 && currentGroupCode) {
                    let category: ScraperInSISStudyPlanCourseCategory['category'] = 'optional'

                    // Logic to determine category based on Group Code
                    if (currentGroupCode.startsWith('cTVS')) {
                        category = 'physical_education'
                    } else if (currentGroupCode.startsWith('oJ') || currentGroupCode.startsWith('fJ') || currentGroupCode === 'sK') {
                        category = 'language'
                    } else if (currentGroupCode.includes('SZ')) {
                        category = 'state_exam'
                    } else if (['cVM', 'cVD', 'cVP', 'cVV'].includes(currentGroupCode)) {
                        category = 'general_elective'
                    } else if (
                        currentGroupCode.endsWith('P') ||
                        currentGroupCode === 'oBP' ||
                        ['oP', 'hP', 'sP', 'fP', 'eP'].some(p => currentGroupCode?.startsWith(p))
                    ) {
                        category = 'compulsory'
                    } else if (currentGroupCode.includes('V') || ['oV', 'hV', 'sV', 'fV', 'eV'].some(p => currentGroupCode?.startsWith(p))) {
                        category = 'elective'
                    }

                    courses.push({
                        id: courseId,
                        url: courseUrl,
                        ident: courseIdent,
                        category: category
                    })
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
