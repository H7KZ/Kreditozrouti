import Config from '@scraper/Config/Config'
import { cleanText } from '@scraper/Utils/HTMLUtils'
import * as cheerio from 'cheerio'

export interface CatalogSearchOptions {
    faculties: { id: number; name: string }[]
    periods: { id: number; name: string }[]
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
        const minYear = new Date().getFullYear() - 1

        // Extract faculties
        $('td#fakulty input[name="fakulta"]').each((_, el) => {
            const id = $(el).val() as string
            const nextNode = el.nextSibling
            const rawName = nextNode?.type === 'text' ? nextNode.data : $(el).parent().text()
            const name = cleanText(rawName)

            if (id && name) {
                faculties.push({
                    id: Number(id.trim()),
                    name: name.toLowerCase()
                })
            }
        })

        // Extract academic periods with year filtering
        $('input[name="obdobi_fak"]').each((_, el) => {
            const id = $(el).val() as string
            const nextNode = el.nextSibling
            const rowText = cleanText(nextNode?.type === 'text' ? nextNode.data : $(el).parent().text())
            const yearMatch = /(\d{4})/.exec(rowText)

            if (yearMatch && id && rowText) {
                const startYear = parseInt(yearMatch[1], 10)
                if (startYear >= minYear) {
                    periods.push({
                        id: Number(id.trim()),
                        name: rowText.toUpperCase()
                    })
                }
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
