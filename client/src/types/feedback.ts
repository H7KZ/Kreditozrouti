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
