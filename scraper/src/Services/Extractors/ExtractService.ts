/**
 * Utility service providing static methods for parsing and sanitizing scraped text data.
 */
export default class ExtractService {
    /**
     * Normalizes a string by removing newlines, tabs, and excessive whitespace.
     *
     * @param value - The raw string to serialize.
     * @returns The cleaned and trimmed string, or null if the input is falsy.
     */
    static serializeValue(value: string | null): string | null {
        if (!value) return null

        return value.replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('\t', ' ').replace(/\s+/g, ' ').trim()
    }
}
