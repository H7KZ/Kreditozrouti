/**
 * Sentiment expressed by the two thumb icons on the feedback card.
 */
export type FeedbackThumbs = 'up' | 'down'

/**
 * Payload for the single `feedback` analytics event.
 *
 * The walking skeleton (#156) only carries the thumb sentiment; the optional
 * 1-5 rating and comment fields arrive in a later ticket.
 */
export interface FeedbackPayload {
	thumbs: FeedbackThumbs
}
