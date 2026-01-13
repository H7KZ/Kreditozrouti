import Config from '@scraper/Config/Config'
import { cleanText } from '@scraper/Utils/HTMLUtils'
import { extractSemester, extractYear } from '@scraper/Utils/InSISUtils'
import * as cheerio from 'cheerio'

export interface CatalogSearchOptions {
    faculties: {
        id: number
        name: string
    }[]

    periods: {
        id: number
        semester: string | null
        year: number | null
    }[]
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
            const nextNode = el.nextSibling
            const rawFaculty = nextNode?.type === 'text' ? nextNode.data : $(el).parent().text()
            const faculty = cleanText(rawFaculty)

            if (id && faculty) {
                faculties.push({
                    id: Number(id.trim()),
                    name: faculty.toLowerCase()
                })
            }
        })

        // Extract academic periods
        $('input[name="obdobi_fak"]').each((_, el) => {
            const id = $(el).val() as string
            const nextNode = el.nextSibling
            const rawPeriod = cleanText(nextNode?.type === 'text' ? nextNode.data : $(el).parent().text())
            const period = cleanText(rawPeriod)

            if (id && period) {
                periods.push({
                    id: Number(id.trim()),
                    semester: extractSemester(period),
                    year: extractYear(period)
                })
            }
        })

        return { faculties, periods }
    }

    /**
     * Extracts a unique list of course syllabus URLs from the catalog listing page.
     */
    static extractCourseUrls(html: string): string[] {
        const $ = cheerio.load(html)
        const urls = new Set<string>()

        $('a[href*="syllabus.pl?predmet="]').each((_, el) => {
            const href = $(el).attr('href')
            if (href) {
                const fullUrl = href.startsWith('http') ? href : Config.insis.catalogUrl + href
                urls.add(fullUrl.trim().split(';')[0])
            }
        })

        return [...urls]
    }
}
