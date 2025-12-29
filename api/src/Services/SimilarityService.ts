/**
 * Service for calculating string similarities and distances.
 * Useful for fuzzy matching titles, names, or identifying duplicate content.
 */
export default class SimilarityService {
    /**
     * Calculates the similarity between two strings using the Levenshtein distance.
     * Returns a normalized value between 0 (completely different) and 1 (identical).
     *
     * @param s1 - First string
     * @param s2 - Second string
     * @param normalize - Whether to remove accents and lowercase strings before comparing (default: true)
     */
    static calculateLevenshteinSimilarity(s1: string, s2: string, normalize = true): number {
        const a = normalize ? this.normalizeString(s1) : s1
        const b = normalize ? this.normalizeString(s2) : s2

        const longer = a.length > b.length ? a : b
        const shorter = a.length > b.length ? b : a
        const longerLength = longer.length

        if (longerLength === 0) {
            return 1.0
        }

        const distance = this.levenshteinDistance(longer, shorter)
        return (longerLength - distance) / parseFloat(longerLength.toString())
    }

    /**
     * Calculates the raw Levenshtein distance (number of edits required).
     */
    static levenshteinDistance(s1: string, s2: string): number {
        const costs = []

        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0) {
                    costs[j] = j
                } else {
                    if (j > 0) {
                        let newValue = costs[j - 1]
                        if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
                        }
                        costs[j - 1] = lastValue
                        lastValue = newValue
                    }
                }
            }
            if (i > 0) {
                costs[s2.length] = lastValue
            }
        }
        return costs[s2.length]
    }

    /**
     * Calculates Jaccard Similarity (Token based).
     * Better for strings where word order doesn't matter (e.g. "2025 Event" vs "Event 2025").
     * Returns 0 to 1.
     */
    static calculateJaccardSimilarity(s1: string, s2: string, normalize = true): number {
        const a = normalize ? this.normalizeString(s1) : s1
        const b = normalize ? this.normalizeString(s2) : s2

        const setA = new Set(a.split(/\s+/))
        const setB = new Set(b.split(/\s+/))

        const intersection = new Set([...setA].filter(x => setB.has(x)))
        const union = new Set([...setA, ...setB])

        if (union.size === 0) return 1.0

        return intersection.size / union.size
    }

    /**
     * Helper to remove accents (diacritics), trim, and lowercase a string.
     * Essential for Czech fuzzy matching (e.g. "Kruhové" -> "kruhove").
     */
    static normalizeString(str: string): string {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .trim()
            .toLowerCase()
    }
}
