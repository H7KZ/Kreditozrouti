import { Cheerio } from 'cheerio'
import Turndown from 'turndown'

export default class MarkdownService {
    private static turndown = new Turndown()

    static formatCheerioElementToMarkdown(element: Cheerio<any>): string {
        if (!element || element.length === 0) {
            return ''
        }

        const html = element.html()

        if (!html) {
            return ''
        }

        return this.turndown.turndown(html)
    }
}
