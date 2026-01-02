/**
 * Utility service providing static methods for parsing and sanitizing scraped text data.
 */
export default class ExtractService {
    /**
     * Normalizes a string by removing newlines, tabs, and excessive whitespace.
     */
    static serializeValue(value: string | null): string | null {
        if (!value) return null

        return value
            .replace(/[\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    }
}
