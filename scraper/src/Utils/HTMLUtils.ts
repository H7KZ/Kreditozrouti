import Config from '@scraper/Config/Config'
import MarkdownService from '@scraper/Services/MarkdownService'
import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'

/**
 * Cleans text by normalizing whitespace and removing nbsp entities.
 */
export function cleanText(text: string | null | undefined): string {
    if (!text) return ''
    return text
        .replace(/\u00A0|&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Normalizes a string by removing newlines, tabs, and excessive whitespace.
 */
export function serializeValue(value: string | null): string | null {
    if (!value) return null

    return value
        .replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Normalizes a relative or absolute URL to a full InSIS URL.
 */
export function normalizeUrl(href: string): string {
    if (href.startsWith('http')) return href
    if (href.startsWith('/')) return Config.insis.baseDomain + href
    return Config.insis.catalogUrl + href
}

/**
 * Extracts the text value from a table row where the first cell contains the label.
 */
export function getRowValue($: CheerioAPI, targetLabel: string): string | null {
    const cleanTarget = cleanText(targetLabel)
    const labelCell = $('td')
        .filter((_, el) => cleanText($(el).text()).includes(cleanTarget))
        .first()

    if (labelCell.length && labelCell.next('td').length) {
        return serializeValue(cleanText(labelCell.next('td').text()))
    }
    return null
}

/**
 * Extracts the text value using case-insensitive matching.
 * Useful for study plan parsing where label casing varies.
 */
export function getRowValueCaseInsensitive($: CheerioAPI, targetLabel: string): string | null {
    const cleanTarget = cleanText(targetLabel).toLowerCase()
    let foundValue: string | null = null

    $('td').each((_, el) => {
        const cellText = cleanText($(el).text()).toLowerCase()
        if (cellText.includes(cleanTarget) && !foundValue) {
            const nextCell = $(el).next('td')
            if (nextCell.length) foundValue = cleanText(nextCell.text())
        }
    })
    return serializeValue(foundValue)
}

/**
 * Extracts markdown content from a section identified by its header text.
 */
export function getSectionContent($: CheerioAPI, headerText: string): string | null {
    const cleanHeader = cleanText(headerText)
    const headerRow = $('td')
        .filter((_, el) => cleanText($(el).text()).includes(cleanHeader))
        .parent('tr')

    if (headerRow.length && headerRow.next('tr').length) {
        return MarkdownService.formatCheerioElementToMarkdown(headerRow.next('tr').find('td'))
    }
    return null
}

/**
 * Parses a cell that contains multiple values separated by <br> tags.
 */
export function parseMultiLineCell($: CheerioAPI, element: any): string[] {
    const htmlContent = $(element).html()
    if (!htmlContent) return []

    return htmlContent
        .split(/<br\s*\/?>/i)
        .map(part => cleanText(cheerio.load(part).text()))
        .filter(part => part.length > 0)
}

/**
 * Replaces &nbsp; entities in the body HTML for consistent parsing.
 */
export function sanitizeBodyHtml($: CheerioAPI): void {
    const body = $('body')
    if (body.length) {
        body.html(body.html()?.replace(/&nbsp;/g, ' ') ?? '')
    }
}
