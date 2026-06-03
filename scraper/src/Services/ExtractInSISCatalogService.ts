import * as cheerio from 'cheerio'
import Config from '@scraper/Config/Config'
import { cleanText } from '@scraper/Utils/HTMLUtils'
import { extractSemester, extractYear } from '@scraper/Utils/InSISUtils'

export interface CatalogSearchOptions {
    faculties: {
        id: number
        identifier: string | undefined
        name: string
    }[]

    periods: {
        id: number
        identifier: string | undefined
        yearId: number
        semester: string | null
        year: number | null
    }[]
}

export interface CatalogCourse {
    url: string
    ident: string
}

/**
 * Extracts catalog-related data from InSIS HTML pages.
 * Handles search form options and course URL extraction.
 */
export default class ExtractInSISCatalogService {
    /**
     * Parses the "Extended Search" form to extract available Faculties and Academic Periods.
     * Filters for Academic Years starting from (current year - 1) to include recent and future periods.
     */
    static extractSearchOptions(html: string): CatalogSearchOptions {
        const $ = cheerio.load(html)
        const faculties: CatalogSearchOptions['faculties'] = []
        const periods: CatalogSearchOptions['periods'] = []

        // Extract faculties
        $('td#fakulty input[name="fakulta"]').each((_, el) => {
            const id = $(el).val() as string
            const identifier = $(el).attr('id')
            const nextNode = el.nextSibling
            const rawFaculty = nextNode?.type === 'text' ? nextNode.data : $(el).parent().text()
            const faculty = cleanText(rawFaculty)

            if (id && faculty) {
                faculties.push({
                    id: Number(id.trim()),
                    identifier: identifier,
                    name: faculty.toLowerCase()
                })
            }
        })

        // Extract academic periods
        $('input[name="obdobi_fak"]').each((_, el) => {
            const id = $(el).val() as string
            const identifier = $(el).closest('div').attr('id')
            const yearId = $(el).parent().siblings().closest('input[name="obdobi"]').val() as string
            const nextNode = el.nextSibling
            const rawPeriod = cleanText(nextNode?.type === 'text' ? nextNode.data : $(el).parent().text())
            const period = cleanText(rawPeriod)

            if (id && period) {
                periods.push({
                    id: Number(id.trim()),
                    identifier: identifier,
                    yearId: Number(yearId.trim()),
                    semester: extractSemester(period),
                    year: extractYear(period)
                })
            }
        })

        return { faculties, periods }
    }

    /**
     * Extracts a unique list of courses (URL + ident) from the catalog listing page.
     * The ident is the first whitespace-delimited token of the anchor text (e.g. "4IZ210").
     */
    static extractCourses(html: string): CatalogCourse[] {
        const $ = cheerio.load(html)
        const seen = new Set<string>()
        const courses: CatalogCourse[] = []

        $('a[href*="syllabus.pl?predmet="]').each((_, el) => {
            const href = $(el).attr('href')
            if (!href) return

            const fullUrl = href.startsWith('http') ? href : Config.insis.catalogUrl + href
            const url = fullUrl.trim().split(';')[0]

            if (seen.has(url)) return
            seen.add(url)

            const text = $(el).text().trim()
            const ident = text.split(/\s/)[0] ?? ''
            if (!ident) return

            courses.push({ url, ident })
        })

        return courses
    }
}
