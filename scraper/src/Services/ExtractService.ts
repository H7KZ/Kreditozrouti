import * as cheerio from 'cheerio'
import { FISEventDetailsInterface } from '@/Interfaces/FISGetEventDetailsInterface'
import { FISEventInterface } from '@/Interfaces/FISGetEventsInterface'
import MarkdownService from '@/Services/MarkdownService'

export default class ExtractService {
    static extractAllArticlesWithParser(html: string): FISEventInterface[] {
        const $ = cheerio.load(html)
        const articles = $('article')

        const allData: FISEventInterface[] = []

        articles.each((index, element) => {
            const article = $(element)

            const link = article.find('a').attr('href') ?? null
            const category = article.find('.divide-x > div:last-child > div').text().trim()

            allData.push({
                eventId: this.serializeValue(link ? (new URL(link).pathname.split('/').filter(Boolean).pop() ?? null) : null),
                postId: this.serializeValue(article.attr('id')?.replace('post-', '') ?? null),
                link: this.serializeValue(link),
                image: {
                    src: this.serializeValue(article.find('img').attr('src') ?? null),
                    alt: this.serializeValue(article.find('img').attr('alt') ?? null)
                },
                date: this.serializeValue(article.find('span').text().trim() ?? null),
                title: this.serializeValue(article.find('h2').text().trim() ?? null),
                category: this.serializeValue(category ?? null)
            })
        })

        return allData
    }

    static extractEventDetailsWithParser(html: string): FISEventDetailsInterface {
        const $ = cheerio.load(html)

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
        const date = $('article .flex-row span').first().text().trim() ?? null

        const descriptionContainer = $('h2:contains("O akci")').next('div')
        const description = MarkdownService.formatCheerioElementToMarkdown(descriptionContainer)

        const place = getDetailByLabel('Místo události:')
        const registrationFrom = getDetailByLabel('Registrace:')
        const dateTime = getDetailByLabel('Datum a čas:')

        const signForm = $('a:contains("Registruj se zde")').attr('href') ?? null

        const substituteForm = $('a:contains("Chci být náhradník")').attr('href') ?? null

        return {
            eventId: this.serializeValue(eventId),
            image: {
                src: this.serializeValue(imageSrc),
                alt: this.serializeValue(imageAlt)
            },
            title: this.serializeValue(title),
            subtitle: this.serializeValue(subtitle),
            date: this.serializeValue(date),
            description: description ?? null,
            place: this.serializeValue(place),
            registrationFrom: this.serializeValue(registrationFrom),
            dateTime: this.serializeValue(dateTime),
            signForm: this.serializeValue(signForm),
            substituteForm: this.serializeValue(substituteForm)
        }
    }

    static serializeValue(value: string | null): string | null {
        if (!value) return null

        return value.replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('\t', ' ').replace(/\s+/g, ' ').trim()
    }
}
