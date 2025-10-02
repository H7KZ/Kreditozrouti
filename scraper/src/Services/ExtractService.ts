import { FISEventInterface } from '@api/Interfaces/FISEventInterface'
import FISEventsInterface from '@api/Interfaces/FISEventsInterface'
import * as cheerio from 'cheerio'
import moment from 'moment'
import MarkdownService from '@/Services/MarkdownService'

export default class ExtractService {
    static extractAllArticlesWithParser(html: string): FISEventsInterface[] {
        const $ = cheerio.load(html)
        const articles = $('article')

        const events: FISEventsInterface[] = []

        articles.each((index, element) => {
            const article = $(element)

            const link = article.find('a').attr('href') ?? null

            const eventId = this.serializeValue(link ? (new URL(link).pathname.split('/').filter(Boolean).pop() ?? null) : null)
            const postId = this.serializeValue(article.attr('id')?.replace('post-', '') ?? null)

            if (eventId && postId) {
                events.push({ eventId, postId })
            }
        })

        return events
    }

    static extractEventDetailsWithParser(html: string): FISEventInterface {
        const $ = cheerio.load(html)

        let author: string | null = null
        let categories: string[] | null = null
        let language: string | null = null

        try {
            const schemaScriptContent = $('script[type="application/ld+json"].yoast-schema-graph').html()

            if (schemaScriptContent) {
                const schemaJson = JSON.parse(schemaScriptContent) as { '@graph': { '@type': string; author?: { name?: string }; articleSection?: string[]; inLanguage?: string }[] }

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

        const getDetailByLabel = (label: string): string | null => {
            const element = $(`span:contains("${label}")`)
            return element.next('span').text().trim() ?? null
        }

        const canonicalUrl = $('link[rel="canonical"]').attr('href')
        let eventId = null
        if (canonicalUrl) {
            const pathParts = canonicalUrl.split('/').filter(part => part !== '')
            eventId = pathParts[pathParts.length - 1] || null
        }

        const title = $('article h1').text().trim() ?? null
        const imageSrc = $('section[class*="event-detail"] img').attr('src') ?? null
        const imageAlt = $('section[class*="event-detail"] img').attr('alt') ?? null
        const subtitle = $('article h1 + span').text().trim() ?? null

        const descriptionContainer = $('h2:contains("O akci")').next('div')
        const description = MarkdownService.formatCheerioElementToMarkdown(descriptionContainer)

        const place = getDetailByLabel('Místo události:')
        const registrationUrl = getDetailByLabel('Registrace:')
        const datetime = getDetailByLabel('Datum a čas:')

        const registrationFrom = $('a:contains("Registruj se zde")').attr('href') ?? null

        const substituteUrl = $('a:contains("Chci být náhradník")').attr('href') ?? null

        return {
            eventId: this.serializeValue(eventId),
            image: {
                src: this.serializeValue(imageSrc),
                alt: this.serializeValue(imageAlt)
            },
            title: this.serializeValue(title),
            subtitle: this.serializeValue(subtitle),
            categories: categories,
            datetime: this.extractDateTimeFromString(this.serializeValue(datetime) ?? '').datetime,
            description: description ?? null,
            place: this.serializeValue(place),
            author: author,
            language: language,
            registrationFrom: this.extractDateTimeFromString(this.serializeValue(registrationFrom) ?? '').date,
            registrationUrl: this.serializeValue(registrationUrl),
            substituteUrl: this.serializeValue(substituteUrl)
        }
    }

    static serializeValue(value: string | null): string | null {
        if (!value) return null

        return value.replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('\t', ' ').replace(/\s+/g, ' ').trim()
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
        ]).zone('Europe/Prague')

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
        ).zone('Europe/Prague')

        const datetime = moment(`${date.format('YYYY-MM-DD')}T${time.format('HH:mm')}`).zone('Europe/Prague')

        return {
            datetime: datetime.isValid() ? datetime.toDate() : null,
            date: date.isValid() ? date.toDate() : null,
            time: time.isValid() ? time.format('HH:mm') : null
        }
    }
}
