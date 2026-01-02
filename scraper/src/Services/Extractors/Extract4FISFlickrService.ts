import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import DateService from '@scraper/Services/DateService'
import ExtractService from '@scraper/Services/Extractors/ExtractService'
import * as cheerio from 'cheerio'

/**
 * Service responsible for parsing HTML content from Flickr.
 */
export default class Extract4FISFlickrService {
    // Compiled regex patterns for performance (reused across calls)
    private static readonly PATTERN_DATE = '(\\d{4}[./-]\\d{1,2}[./-]\\d{1,2}(?:-\\d{1,2})?|\\d{4}[./-]\\d{1,2})'
    private static readonly PATTERN_CAT = '([A-Z]{2,3}(?:/[A-Z]{2,3})?)'

    private static readonly REGEX = {
        CAT_DATE_TITLE: new RegExp(`^${Extract4FISFlickrService.PATTERN_CAT}\\s*-\\s*${Extract4FISFlickrService.PATTERN_DATE}\\s*-\\s*(.*)$`),
        CAT_DATE_SPACE_TITLE: new RegExp(`^${Extract4FISFlickrService.PATTERN_CAT}\\s*-\\s*${Extract4FISFlickrService.PATTERN_DATE}\\s+(.*)$`),
        CAT_TITLE_DATE: new RegExp(`^${Extract4FISFlickrService.PATTERN_CAT}\\s*-\\s*(.*?)\\s+(${Extract4FISFlickrService.PATTERN_DATE}|\\d{4})$`),
        DATE_HYPHEN_TITLE: new RegExp(`^${Extract4FISFlickrService.PATTERN_DATE}\\s*-\\s*(.*)$`),
        DATE_SPACE_TITLE: new RegExp(`^${Extract4FISFlickrService.PATTERN_DATE}\\s+(.*)$`),
        TITLE_DATE: new RegExp(`^(.*)\\s*[- ]\\s*(${Extract4FISFlickrService.PATTERN_DATE}|\\d{4})$`),
        TITLE_DATE_TITLE: new RegExp(`^(.*?)\\s+(${Extract4FISFlickrService.PATTERN_DATE}|\\d{4})\\s*-\\s*(.*)$`),
        CAT_TITLE: new RegExp(`^${Extract4FISFlickrService.PATTERN_CAT}\\s*-\\s*(.*)$`)
    }

    private static readonly CAT_MAPPING: Record<string, string> = {
        KA: 'Kruhy',
        SA: 'Sporty',
        SP: 'Sporty',
        NA: 'Nevzdělávačky',
        SRA: 'Nevzdělávačky',
        VA: 'Vzdělávačky',
        GA: 'Gaming',
        PR: 'Další',
        HR: 'Další'
    }

    /**
     * Extracts Album IDs from the main list page.
     */
    static extractAlbumLinks(html: string): Scraper4FISEvents {
        const $ = cheerio.load(html)
        const eventIds: string[] = []

        $('a').each((_, el) => {
            const href = $(el).attr('href')
            const match = /^\/photos\/4fis\/albums\/(\d+)$/.exec(href ?? '')
            if (match?.[1]) {
                eventIds.push(match[1])
            }
        })

        return { ids: [...new Set(eventIds)] }
    }

    /**
     * Extracts details from a specific Album page.
     */
    static extractEvent(html: string, eventId: string): Scraper4FISEvent | null {
        const $ = cheerio.load(html)
        const rawTitle = $('h1.title').text().trim() ?? $('meta[property="og:title"]').attr('content')?.trim() ?? $('title').text().split('|')[0].trim()

        if (!rawTitle) return null

        let title = rawTitle
        let datetime: Date | null = null
        const categories: string[] = []

        // Pattern matching
        let match: RegExpExecArray | null
        if ((match = this.REGEX.CAT_DATE_TITLE.exec(rawTitle))) {
            categories.push(match[1])
            datetime = DateService.extractDateFromFlickrString(match[2])
            title = match[3]
        } else if ((match = this.REGEX.CAT_DATE_SPACE_TITLE.exec(rawTitle))) {
            categories.push(match[1])
            datetime = DateService.extractDateFromFlickrString(match[2])
            title = match[3]
        } else if ((match = this.REGEX.CAT_TITLE_DATE.exec(rawTitle))) {
            categories.push(match[1])
            title = match[2]
            datetime = DateService.extractDateFromFlickrString(match[3])
        } else if ((match = this.REGEX.DATE_HYPHEN_TITLE.exec(rawTitle))) {
            datetime = DateService.extractDateFromFlickrString(match[1])
            title = match[2]
        } else if ((match = this.REGEX.DATE_SPACE_TITLE.exec(rawTitle))) {
            datetime = DateService.extractDateFromFlickrString(match[1])
            title = match[2]
        } else if ((match = this.REGEX.TITLE_DATE_TITLE.exec(rawTitle))) {
            const subTitle = match[3] ? match[3].trim() : ''
            title = subTitle ? `${match[1]} - ${subTitle}` : match[1]
            datetime = DateService.extractDateFromFlickrString(match[2])
        } else if ((match = this.REGEX.TITLE_DATE.exec(rawTitle))) {
            title = match[1]
            datetime = DateService.extractDateFromFlickrString(match[2])
        } else if ((match = this.REGEX.CAT_TITLE.exec(rawTitle))) {
            categories.push(match[1])
            title = match[2]
        }

        title = this.cleanTitle(title)
        if (title.toLowerCase().includes('seznamovák')) categories.push('Seznamovák')

        const photoCount = $('.stat.photo-count').text().trim()

        let image_src = $('meta[property="og:image"]').attr('content') ?? null
        if (!image_src) {
            const firstImg = $('.photo-card-content .photo img').first().attr('src')
            if (firstImg) image_src = firstImg.startsWith('//') ? `https:${firstImg}` : firstImg
        }

        const flattenedCategories = categories.flatMap(c => c.split('/').map(cat => cat.trim()))

        return {
            id: ExtractService.serializeValue(eventId),
            title: ExtractService.serializeValue(title),
            subtitle: ExtractService.serializeValue(photoCount ? `Flickr Album (${photoCount})` : 'Flickr Album'),
            image: {
                src: ExtractService.serializeValue(image_src),
                alt: ExtractService.serializeValue(title)
            },
            categories: flattenedCategories.length > 0 ? flattenedCategories.map(c => this.remapCategoryToFullName(c)) : null,
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
        return this.CAT_MAPPING[category.toUpperCase()] || category
    }
}
