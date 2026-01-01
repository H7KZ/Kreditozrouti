import Scraper4FISEvent from '@scraper/Interfaces/Scraper4FISEvent'
import Scraper4FISEvents from '@scraper/Interfaces/Scraper4FISEvents'
import DateService from '@scraper/Services/DateService'
import ExtractService from '@scraper/Services/Extractors/ExtractService'
import MarkdownService from '@scraper/Services/MarkdownService'
import * as cheerio from 'cheerio'

/**
 * Interface describing the expected structure of the JSON-LD schema graph.
 */
interface SchemaGraph {
    '@graph': {
        '@type': string
        author?: { name?: string }
        articleSection?: string[]
        inLanguage?: string
    }[]
}

/**
 * Service responsible for parsing HTML content from the FIS website.
 * Extracts event lists and detailed event metadata using Cheerio.
 */
export default class Extract4FISService {
    /**
     * Generates base HTTP headers for requests to the FIS website.
     * * @returns An object containing standard browser headers.
     */
    static baseRequestHeaders(): Record<string, string> {
        return {
            'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
        }
    }

    /**
     * Parses the HTML of an events listing page to find event identifiers.
     * Iterates through article elements to extract IDs from their permalinks.
     *
     * @param html - The raw HTML content of the events listing page.
     * @returns An object containing the list of discovered event IDs.
     */
    static extractEventArticles(html: string): Scraper4FISEvents {
        const $ = cheerio.load(html)
        const eventIds: string[] = []

        $('article').each((_, el) => {
            const link = $(el).find('a').attr('href')
            const eventId = Extract4FISService.parseEventIdFromUrl(link)

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

        const eventId = Extract4FISService.parseEventIdFromUrl(siteUrl)
        if (!eventId) return null

        const schemaData = Extract4FISService.extractSchemaData($)

        const title = $('article h1').text().trim() || null
        const imageElement = $('section[class*="event-detail"] img')
        const subtitle = $('article h1 + span').text().trim() || null

        // Extract description converted to Markdown
        const descriptionContainer = $('h2:contains("O akci")').next('div')
        const description = MarkdownService.formatCheerioElementToMarkdown(descriptionContainer)

        // Helper to extract text from a sibling span based on a label
        const getDetailByLabel = (label: string): string | null => {
            return $(`span:contains("${label}")`).next('span').text().trim() || null
        }

        // Field extraction using specific label selectors
        // Note: Formatting in selectors preserves matches against source HTML whitespace irregularities

        let place = getDetailByLabel('Místo události:')
        place ??= getDetailByLabel(`Místo
                  události:`)

        let datetime = getDetailByLabel('Datum a čas:')
        datetime ??= getDetailByLabel(`Začátek akce:              `)

        const registrationFrom = getDetailByLabel('Registrace:')
        const registrationUrl = $('a:contains("Registruj se zde")').attr('href') ?? null
        const substituteUrl = $('a:contains("Chci být náhradník")').attr('href') ?? null

        return {
            id: ExtractService.serializeValue(eventId),
            image: {
                src: ExtractService.serializeValue(imageElement.attr('src') ?? null),
                alt: ExtractService.serializeValue(imageElement.attr('alt') ?? null)
            },
            title: ExtractService.serializeValue(title),
            subtitle: ExtractService.serializeValue(subtitle),
            categories: schemaData.categories,
            datetime: Extract4FISService.formatIsoDate(datetime),
            description: description ?? null,
            place: ExtractService.serializeValue(place),
            author: schemaData.author,
            language: schemaData.language,
            registration_from: Extract4FISService.formatIsoDate(registrationFrom, true),
            registration_url: ExtractService.serializeValue(registrationUrl),
            substitute_url: ExtractService.serializeValue(substituteUrl)
        }
    }

    /**
     * Helper to parse the event ID from a given URL string.
     * * @param url - The URL string to parse.
     * @returns The parsed path ID or null if invalid.
     */
    private static parseEventIdFromUrl(url: string | undefined | null): string | null {
        if (!url) return null
        const path = new URL(url).pathname.split('/').filter(Boolean).join('/')
        return ExtractService.serializeValue(path || null)
    }

    /**
     * Helper to extract and parse JSON-LD schema data.
     * * @param $ - The Cheerio loaded instance.
     * @returns An object containing author, categories, and language.
     */
    private static extractSchemaData($: cheerio.CheerioAPI) {
        let author: string | null = null
        let categories: string[] | null = null
        let language: string | null = null

        try {
            const schemaScriptContent = $('script[type="application/ld+json"].yoast-schema-graph').html()
            if (schemaScriptContent) {
                const schemaJson = JSON.parse(schemaScriptContent) as SchemaGraph
                const articleSchema = schemaJson['@graph'].find(i => i['@type'] === 'Article')

                if (articleSchema) {
                    author = articleSchema.author?.name ?? null
                    categories = articleSchema.articleSection ?? null
                    language = articleSchema.inLanguage ?? null
                }
            }
        } catch {
            // Fail silently if schema is missing or malformed
        }

        return { author, categories, language }
    }

    /**
     * Helper to format a date string into an ISO string using DateService.
     * * @param dateString - The raw date string.
     * @param dateString
     * @param isDateOnly - Whether to extract just the date portion.
     * @returns The ISO date string or null.
     */
    private static formatIsoDate(dateString: string | null, isDateOnly = false): string | null {
        const value = ExtractService.serializeValue(dateString) ?? ''
        const extraction = DateService.extractDateTimeFromString(value)

        if (isDateOnly) {
            return extraction.date?.toISOString() ?? null
        }
        return extraction.datetime?.toISOString() ?? null
    }
}
