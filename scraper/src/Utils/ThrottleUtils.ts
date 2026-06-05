import type { ScrapingMode } from '@scraper/types/jobs'

/**
 * Concurrency limit for mode-driven parallel loops (catalog combos, studyplans BFS).
 * Catalog: turbo=6, normal=3, polite=1
 * StudyPlans BFS: turbo=10, normal=4, polite=2
 */
export function catalogConcurrencyForMode(mode: ScrapingMode): number {
    switch (mode) {
        case 'turbo': return 6
        case 'normal': return 3
        case 'polite': return 1
    }
}

export function bfsConcurrencyForMode(mode: ScrapingMode): number {
    switch (mode) {
        case 'turbo': return 10
        case 'normal': return 4
        case 'polite': return 2
    }
}

/**
 * Delay in ms applied per leaf job index when enqueueing Course/StudyPlan jobs.
 * Stored in BullMQ (Redis) — crash-safe.
 * turbo=0ms, normal=1000ms, polite=3000ms
 */
export function leafDelayForMode(mode: ScrapingMode): number {
    switch (mode) {
        case 'turbo': return 0
        case 'normal': return 1000
        case 'polite': return 3000
    }
}
