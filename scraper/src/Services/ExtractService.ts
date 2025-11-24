import FISEventInterface from '@scraper/Interfaces/FIS/FISEventInterface'
import FISEventsInterface from '@scraper/Interfaces/FIS/FISEventsInterface'
import InSISCatalogInterface from '@scraper/Interfaces/InSIS/InSISCatalogInterface'
import MarkdownService from '@scraper/Services/MarkdownService'
import * as cheerio from 'cheerio'
import moment from 'moment'

export default class ExtractService {
    static extractAllFISEventArticlesWithParser(html: string): FISEventsInterface {
        const $ = cheerio.load(html)
        const articles = $('article')

        const eventIds: string[] = []

        articles.each((i, el) => {
            const article = $(el)

            const link = article.find('a').attr('href') ?? null

            const eventId = this.serializeValue(link ? (new URL(link).pathname.split('/').filter(Boolean).join('/') ?? null) : null)

            if (eventId) {
                eventIds.push(eventId)
            }
        })

        return { ids: eventIds }
    }

    static extractFISEventDetailsWithParser(html: string): FISEventInterface | null {
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
            id: this.serializeValue(eventId),
            image: {
                src: this.serializeValue(image_src),
                alt: this.serializeValue(image_alt)
            },
            title: this.serializeValue(title),
            subtitle: this.serializeValue(subtitle),
            categories: categories,
            datetime: this.extractDateTimeFromString(this.serializeValue(datetime) ?? '').datetime?.toISOString() ?? null,
            description: description ?? null,
            place: this.serializeValue(place),
            author: author,
            language: language,
            registration_from: this.extractDateTimeFromString(this.serializeValue(registration_from) ?? '').date?.toISOString() ?? null,
            registration_url: this.serializeValue(registration_url),
            substitute_url: this.serializeValue(substitute_url)
        }
    }

    static extractInSISCatalogCoursesWithParser(html: string): InSISCatalogInterface {
        const $ = cheerio.load(html)
        const subjects: string[] = []
        const baseUrl = 'https://insis.vse.cz/katalog/'

        $('a[href*="syllabus.pl?predmet="]').each((i, el) => {
            const href = $(el).attr('href')

            if (href) {
                const fullUrl = href.startsWith('http') ? href : baseUrl + href
                subjects.push(fullUrl.trim())
            }
        })

        return { urls: [...new Set(subjects)] }
    }

    static extractDateTimeFromString(text: string): { datetime: Date | null; date: Date | null; time: string | null } {
        if (!text) {
            return {
                datetime: null,
                date: null,
                time: null
            }
        }

        const date = moment(text.replace(/[,\s]+/, ' ').trim(), [
            'D. M. YYYY',
            'D. M. YY',
            'D. M. Y',
            'D. M.',
            'DD. MM. YYYY',
            'DD. MM. YY',
            'DD. MM. Y',
            'DD. MM.',
            'D.M.YYYY',
            'D.M.YY',
            'D.M.Y',
            'D.M.',
            'DD.MM.YYYY',
            'DD.MM.YY',
            'DD.MM.Y',
            'DD.MM.'
        ]).utcOffset('Europe/Prague')

        const time = moment(
            text
                .replace(date.format('D. M. YYYY'), '')
                .replace(date.format('D. M. YY'), '')
                .replace(date.format('D. M. Y'), '')
                .replace(date.format('D. M.'), '')
                .replace(date.format('DD. MM. YYYY'), '')
                .replace(date.format('DD. MM. YY'), '')
                .replace(date.format('DD. MM. Y'), '')
                .replace(date.format('DD. MM.'), '')
                .replace(date.format('D.M.YYYY'), '')
                .replace(date.format('D.M.YY'), '')
                .replace(date.format('D.M.Y'), '')
                .replace(date.format('D.M.'), '')
                .replace(date.format('DD.MM.YYYY'), '')
                .replace(date.format('DD.MM.YY'), '')
                .replace(date.format('DD.MM.Y'), '')
                .replace(date.format('DD.MM.'), '')
                .replace(/[,\s]+/, ' ')
                .trim(),
            ['H:mm', 'HH:mm']
        ).utcOffset('Europe/Prague')

        const datetime = moment(`${date.format('YYYY-MM-DD')}T${time.format('HH:mm')}`).utcOffset('Europe/Prague')

        return {
            datetime: datetime.isValid() ? datetime.toDate() : null,
            date: date.isValid() ? date.toDate() : null,
            time: time.isValid() ? time.format('HH:mm') : null
        }
    }

    private static serializeValue(value: string | null): string | null {
        if (!value) return null

        return value.replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('\t', ' ').replace(/\s+/g, ' ').trim()
    }
}
