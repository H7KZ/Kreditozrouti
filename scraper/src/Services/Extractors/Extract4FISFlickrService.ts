import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import DateService from '@scraper/Services/DateService'
import ExtractService from '@scraper/Services/Extractors/ExtractService'
import * as cheerio from 'cheerio'

/**
 * Service responsible for parsing HTML content from Flickr.
 */
export default class Extract4FISFlickrService {
    /**
     * Extracts Album IDs from the main list page.
     * Strictly looks for anchor tags with href matching "/photos/4fis/albums/{id}".
     */
    static extractAlbumLinks(html: string): Scraper4FISEvents {
        const $ = cheerio.load(html)

        const eventIds: string[] = []

        $('a').each((_, el) => {
            const href = $(el).attr('href')

            // Strictly match the pattern /photos/4fis/albums/{numeric_id}
            if (href) {
                const match = /^\/photos\/4fis\/albums\/(\d+)$/.exec(href)

                if (match?.[1]) {
                    eventIds.push(match[1])
                }
            }
        })

        return { ids: [...new Set(eventIds)] }
    }

    /**
     * Extracts details from a specific Album page.
     * Scrapes Title, Date, Category, Stats, and Images.
     */
    static extractEvent(html: string, eventId: string): Scraper4FISEvent | null {
        const $ = cheerio.load(html)

        // 1. Basic Metadata Extraction
        const rawTitle = $('h1.title').text().trim() ?? $('meta[property="og:title"]').attr('content')?.trim() ?? $('title').text().split('|')[0].trim()

        if (!rawTitle) return null

        let title = rawTitle
        let datetime: Date | null = null
        let categories: string[] = []

        // 2. Advanced Regex Parsing

        // Updated Date Pattern: Allows single digits (2024/1/1) and ranges (2022/05/11-13)
        const datePattern = '(\\d{4}[./-]\\d{1,2}[./-]\\d{1,2}(?:-\\d{1,2})?|\\d{4}[./-]\\d{1,2})'

        // Category Pattern: KA, SA, KA/PR (2-3 chars)
        const categoryPattern = '([A-Z]{2,3}(?:/[A-Z]{2,3})?)'

        // A. "Category - Date - Title"
        // ex: "KA - 2025/11/25 - Kruhové bruslení"
        const regexCatDateTitle = new RegExp(`^${categoryPattern}\\s*-\\s*${datePattern}\\s*-\\s*(.*)$`)

        // B. "Category - Date Title" (Space separator)
        // ex: "KA - 2025/11/25 Kruhové bruslení"
        const regexCatDateSpaceTitle = new RegExp(`^${categoryPattern}\\s*-\\s*${datePattern}\\s+(.*)$`)

        // C. "Category - Title Date"
        // ex: "KA - Kruhové bruslení 2025/11/25"
        const regexCatTitleDate = new RegExp(`^${categoryPattern}\\s*-\\s*(.*?)\\s+(${datePattern}|\\d{4})$`)

        // D. "Date - Title" (Hyphen separator)
        // ex: "2019/11/7 - Základy v Tableau"
        const regexDateHyphenTitle = new RegExp(`^${datePattern}\\s*-\\s*(.*)$`)

        // E. "Date Title" (Space separator)
        // ex: "2023/02/22 4FIS & Actum Digital"
        const regexDateSpaceTitle = new RegExp(`^${datePattern}\\s+(.*)$`)

        // F. "Title - Date" or "Title Date" (Date at end)
        // ex: "Seznamovák - 2025", "Akce 2024/05/01"
        const regexTitleDate = new RegExp(`^(.*)\\s*[- ]\\s*(${datePattern}|\\d{4})$`)

        // G. "Title1 Date - Title2" (Date embedded)
        // ex: "Seznamovák 2025 - 1. turnus"
        const regexTitleDateTitle = new RegExp(`^(.*?)\\s+(${datePattern}|\\d{4})\\s*-\\s*(.*)$`)

        // H. "Category - Title" (No date)
        // ex: "KA - Kruhové bruslení"
        const regexCatTitle = new RegExp(`^${categoryPattern}\\s*-\\s*(.*)$`)

        if (regexCatDateTitle.test(rawTitle)) {
            const match = regexCatDateTitle.exec(rawTitle)
            if (match) {
                categories.push(match[1])
                datetime = DateService.extractDateFromFlickrString(match[2])
                title = match[3]
            }
        } else if (regexCatDateSpaceTitle.test(rawTitle)) {
            const match = regexCatDateSpaceTitle.exec(rawTitle)
            if (match) {
                categories.push(match[1])
                datetime = DateService.extractDateFromFlickrString(match[2])
                title = match[3]
            }
        } else if (regexCatTitleDate.test(rawTitle)) {
            const match = regexCatTitleDate.exec(rawTitle)
            if (match) {
                categories.push(match[1])
                title = match[2]
                datetime = DateService.extractDateFromFlickrString(match[3])
            }
        } else if (regexDateHyphenTitle.test(rawTitle)) {
            const match = regexDateHyphenTitle.exec(rawTitle)
            if (match) {
                datetime = DateService.extractDateFromFlickrString(match[1])
                title = match[2]
            }
        } else if (regexDateSpaceTitle.test(rawTitle)) {
            const match = regexDateSpaceTitle.exec(rawTitle)
            if (match) {
                datetime = DateService.extractDateFromFlickrString(match[1])
                title = match[2]
            }
        } else if (regexTitleDateTitle.test(rawTitle)) {
            const match = regexTitleDateTitle.exec(rawTitle)
            if (match) {
                const subTitle = match[3] ? match[3].trim() : ''
                title = subTitle ? `${match[1]} - ${subTitle}` : match[1]
                datetime = DateService.extractDateFromFlickrString(match[2])
            }
        } else if (regexTitleDate.test(rawTitle)) {
            const match = regexTitleDate.exec(rawTitle)
            if (match) {
                title = match[1]
                datetime = DateService.extractDateFromFlickrString(match[2])
            }
        } else if (regexCatTitle.test(rawTitle)) {
            const match = regexCatTitle.exec(rawTitle)
            if (match) {
                categories.push(match[1])
                title = match[2]
            }
        }

        title = this.cleanTitle(title)

        // 3. Stats
        const photoCount = $('.stat.photo-count').text().trim()

        // 4. Image Extraction
        let image_src: string | null = null
        const ogImage = $('meta[property="og:image"]').attr('content')

        if (ogImage) {
            image_src = ogImage
        } else {
            const firstImg = $('.photo-card-content .photo img').first()
            const src = firstImg.attr('src')
            if (src) {
                image_src = src.startsWith('//') ? `https:${src}` : src
            }
        }

        categories = categories.flatMap(c => c.split('/').map(cat => cat.trim()))

        return {
            id: ExtractService.serializeValue(eventId),
            title: ExtractService.serializeValue(title),
            subtitle: ExtractService.serializeValue(photoCount ? `Flickr Album (${photoCount})` : 'Flickr Album'),
            image: {
                src: ExtractService.serializeValue(image_src),
                alt: ExtractService.serializeValue(title)
            },
            categories: categories.length > 0 ? categories.map(c => this.remapCategoryToFullName(c)) : null,
            datetime: datetime?.toISOString() ?? null,
            description: null,
            place: null,
            author: '4fisclub',
            language: 'cs',
            registration_from: null,
            registration_url: null,
            substitute_url: null
        }
    }

    private static cleanTitle(title: string): string {
        return title.replace(/[\s-]+$/, '').trim()
    }

    private static remapCategoryToFullName(category: string): string {
        const mapping: Record<string, string> = {
            KA: 'Kruhové akce',
            SA: 'Sportovní akce',
            SP: 'Sportovní akce',
            NA: 'Nezdělávací akce',
            SRA: 'Nezdělávací akce',
            VA: 'Vzdělávací akce',
            GA: 'Gamingové akce',
            PR: 'PR akce',
            HR: 'HR akce'
        }

        return mapping[category.toUpperCase()] || category
    }
}
