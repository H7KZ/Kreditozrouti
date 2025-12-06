import InSISCatalogInterface from '@scraper/Interfaces/InSIS/InSISCatalogInterface'
import InSISCourseInterface, { AssessmentMethod, TimetableUnit } from '@scraper/Interfaces/InSIS/InSISCourseInterface'
import ExtractService from '@scraper/Services/ExtractService'
import MarkdownService from '@scraper/Services/MarkdownService'
import * as cheerio from 'cheerio'

export default class ExtractInSISService {
    static extractInSISCatalogCoursesWithParser(html: string): InSISCatalogInterface {
        const $ = cheerio.load(html)
        const subjects: string[] = []
        const baseUrl = 'https://insis.vse.cz/katalog/'

        $('a[href*="syllabus.pl?predmet="]').each((i, el) => {
            const href = $(el).attr('href')

            if (href) {
                const fullUrl = href.startsWith('http') ? href : baseUrl + href
                subjects.push(fullUrl.trim().split(';')[0])
            }
        })

        return { urls: [...new Set(subjects)] }
    }

    static extractInSISCourseWithParser(html: string, url: string): InSISCourseInterface {
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
            const idRaw = new URL(url).searchParams.get('predmet')
            if (idRaw) id = parseInt(idRaw, 10)
        }

        if (id === null) {
            throw new Error('Course ID not found in the HTML content or URL.')
        }

        const ident = getRowValue('Kód předmětu:')
        const title = getRowValue('Název v jazyce výuky:') ?? getRowValue('Název česky:')
        const czech_title = getRowValue('Název česky:')

        const ectsRaw = getRowValue('Počet přidělených ECTS kreditů:')
        const ects = ectsRaw ? parseInt(ectsRaw.split(' ')[0], 10) : null

        const mode_of_delivery = getRowValue('Forma výuky kurzu:')
        const mode_of_completion = getRowValue('Forma ukončení kurzu:')

        const languagesRaw = getRowValue('Jazyk výuky:')
        const languages = languagesRaw
            ? languagesRaw
                  .split(', ')
                  .map(lang => ExtractService.serializeValue(lang.trim()))
                  .filter(lang => lang !== null)
            : null

        const semester = getRowValue('Semestr:')

        const levelYearRaw = getRowValue('Doporučený typ a ročník studia:')
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

        const assessment_methods: AssessmentMethod[] = []
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

        const timetableUnitsMap = new Map<string, TimetableUnit>()

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
            ident,
            title,
            czech_title,
            ects,
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
}
