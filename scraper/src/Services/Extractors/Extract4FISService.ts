import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import ExtractService from '@scraper/Services/Extractors/ExtractService'
import MarkdownService from '@scraper/Services/MarkdownService'
import * as cheerio from 'cheerio'

/**
 * Service responsible for parsing HTML content from the FIS website.
 * Extracts event lists and detailed event metadata using Cheerio.
 */
export default class Extract4FISService {
    /**
     * Parses the HTML of an events listing page to find event identifiers.
     * Iterates through article elements to extract IDs from their permalinks.
     *
     * @param html - The raw HTML content of the events listing page.
     * @returns An object containing the list of discovered event IDs.
     */
    static extractEventArticles(html: string): Scraper4FISEvents {
        const $ = cheerio.load(html)
        const articles = $('article')

        const eventIds: string[] = []

        articles.each((i, el) => {
            const article = $(el)

            const link = article.find('a').attr('href') ?? null

            const eventId = ExtractService.serializeValue(link ? (new URL(link).pathname.split('/').filter(Boolean).join('/') ?? null) : null)

            if (eventId) {
                eventIds.push(eventId)
            }
        })

        return { ids: eventIds }
    }

    /**
     * Parses the HTML of a specific event page to extract detailed metadata.
     * Combines data from embedded JSON-LD schema and DOM elements (converted to Markdown).
     *
     * @param html - The raw HTML content of the event page.
     * @returns The structured event data, or null if critical information (like the canonical URL) is missing.
     */
    static extractEvent(html: string): Scraper4FISEvent | null {
        const $ = cheerio.load(html)

        const siteUrl = $('link[rel="canonical"]').attr('href')
        if (!siteUrl) return null

        const eventId = new URL(siteUrl).pathname.split('/').filter(Boolean).join('/') ?? null
        if (!eventId) return null

        let author: string | null = null
        let categories: string[] | null = null
        let language: string | null = null

        try {
            const schemaScriptContent = $('script[type="application/ld+json"].yoast-schema-graph').html()

            if (schemaScriptContent) {
                const schemaJson = JSON.parse(schemaScriptContent) as {
                    '@graph': {
                        '@type': string
                        author?: {
                            name?: string
                        }
                        articleSection?: string[]
                        inLanguage?: string
                    }[]
                }

                const articleSchema = schemaJson['@graph'].find(i => i['@type'] === 'Article')

                if (articleSchema) {
                    author = articleSchema.author?.name ?? null
                    categories = articleSchema.articleSection ?? null
                    language = articleSchema.inLanguage ?? null
                }
            }
        } catch {
            author = null
            categories = null
            language = null
        }

        const title = $('article h1').text().trim() ?? null
        const image_src = $('section[class*="event-detail"] img').attr('src') ?? null
        const image_alt = $('section[class*="event-detail"] img').attr('alt') ?? null
        const subtitle = $('article h1 + span').text().trim() ?? null

        const descriptionContainer = $('h2:contains("O akci")').next('div')
        const description = MarkdownService.formatCheerioElementToMarkdown(descriptionContainer)

        const getDetailByLabel = (label: string): string | null => {
            const element = $(`span:contains("${label}")`)
            return element.next('span').text().trim() ?? null
        }

        const place = getDetailByLabel('Místo události:')
        const registration_from = getDetailByLabel('Registrace:')
        const datetime = getDetailByLabel('Datum a čas:')

        const registration_url = $('a:contains("Registruj se zde")').attr('href') ?? null

        const substitute_url = $('a:contains("Chci být náhradník")').attr('href') ?? null

        return {
            id: ExtractService.serializeValue(eventId),
            image: {
                src: ExtractService.serializeValue(image_src),
                alt: ExtractService.serializeValue(image_alt)
            },
            title: ExtractService.serializeValue(title),
            subtitle: ExtractService.serializeValue(subtitle),
            categories: categories,
            datetime: ExtractService.extractDateTimeFromString(ExtractService.serializeValue(datetime) ?? '').datetime?.toISOString() ?? null,
            description: description ?? null,
            place: ExtractService.serializeValue(place),
            author: author,
            language: language,
            registration_from: ExtractService.extractDateTimeFromString(ExtractService.serializeValue(registration_from) ?? '').date?.toISOString() ?? null,
            registration_url: ExtractService.serializeValue(registration_url),
            substitute_url: ExtractService.serializeValue(substitute_url)
        }
    }
}
