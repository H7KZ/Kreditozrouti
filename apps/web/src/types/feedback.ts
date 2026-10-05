/**
 * Sentiment expressed by the two thumb icons on the feedback card.
 */
export type FeedbackThumbs = 'up' | 'down'

/**
 * Payload for the single `feedback` analytics event.
 *
 * `thumbs` is always present. `rating` (1-5) and `message` are optional
 * enrichment - a thumb alone is a complete answer. `message` is the raw
 * textarea value; the store trims and guards it before sending.
 */
export interface FeedbackPayload {
	thumbs: FeedbackThumbs
	rating?: number
	message?: string
}

/**
 * Persisted state backing the feedback prompt's eligibility gate.
 *
 * - `submitted` - once true, the user has answered and is never prompted again.
 * - `dismissedAt` - epoch ms of the last dismissal; suppresses the prompt for a
 *   90-day cooldown, then the user becomes eligible again. `null` when never
 *   dismissed.
 * - `visitDays` - distinct `YYYY-MM-DD` day strings, appended once per calendar
 *   day on app init, used for the returning-user gate.
 */
export interface PersistedFeedbackState {
	submitted: boolean
	dismissedAt: number | null
	visitDays: string[]
}
