import { Cheerio } from 'cheerio'
import Turndown from 'turndown'

/**
 * Utility service for converting HTML content into Markdown format.
 */
export default class MarkdownService {
    /** Static instance of the Turndown service used for HTML-to-Markdown conversion. */
    private static turndown = new Turndown()

    /**
     * Converts the inner HTML of a given Cheerio element into a Markdown string.
     *
     * @param element - The Cheerio object containing the HTML to convert.
     * @returns The generated Markdown string, or an empty string if the element is empty.
     */
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
