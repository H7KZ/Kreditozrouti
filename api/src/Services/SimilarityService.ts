/**
 * Service for calculating string similarities and fuzzy matching.
 * Used to identify duplicate events or merge content from different sources.
 */
export default class SimilarityService {
    /**
     * Determines if two titles represent the same entity using token intersection.
     * Uses Jaccard-style overlap to handle reordered words and noise.
     *
     * Logic:
     * 1. Normalizes strings (lowercase, remove noise/prefixes).
     * 2. Splits into tokens (keeps numbers to distinguish "vol. 1" from "vol. 2").
     * 3. Calculates the overlap ratio relative to the shorter string.
     *
     * @param s1 - First title string.
     * @param s2 - Second title string.
     * @returns True if overlap is >= 60%.
     */
    static areTitlesSimilar(s1: string, s2: string): boolean {
        const getTokens = (text: string) => {
            return new Set(
                SimilarityService.normalizeString(text)
                    .split(/\s+/)
                    // Keep words longer than 2 chars OR any numbers (e.g., "16")
                    .filter(w => w.length > 2 || /\d+/.test(w))
            )
        }

        const tokensA = getTokens(s1)
        const tokensB = getTokens(s2)

        if (tokensA.size === 0 || tokensB.size === 0) return false

        let matches = 0
        tokensA.forEach(token => {
            if (tokensB.has(token)) matches++
        })

        // We use minSize to calculate "overlap relative to the shorter title"
        // This helps match "Event Name" with "4FIS: Event Name (Extra Info)"
        const minSize = Math.min(tokensA.size, tokensB.size)
        const ratio = matches / minSize

        return ratio >= 0.6
    }

    /**
     * Normalizes a string by removing diacritics, trimming, lowercasing,
     * and removing known noise (dates, prefixes).
     */
    static normalizeString(str: string): string {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .toLowerCase()
            .replace(/4fis[:\s]*/g, '') // Remove 4FIS prefix
            .replace(/\d{4}[/-]\d{2}[/-]\d{2}/g, '') // Remove dates like 2022-01-01
            .replace(/[^\w\s]/g, ' ') // Remove special chars
            .trim()
    }
}
