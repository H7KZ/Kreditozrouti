import type { PersistedFeedbackState } from '@client/types'

/**
 * Maximum stored length of a feedback comment. Umami silently truncates event
 * strings beyond 500 chars, so the textarea caps input here and this util keeps
 * its output within the same bound - the user sees exactly what will be stored.
 */
export const FEEDBACK_MESSAGE_MAX_LENGTH = 500

/** Distinct calendar days a user must have visited before the prompt can appear. */
export const FEEDBACK_MIN_VISIT_DAYS = 2

/** Cooldown after a dismissal before the user becomes eligible again (90 days, in ms). */
export const FEEDBACK_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000

/** The empty persisted state for a user who has never interacted with the prompt. */
export function defaultFeedbackState(): PersistedFeedbackState {
	return { submitted: false, dismissedAt: null, visitDays: [] }
}

/**
 * Format a date as a `YYYY-MM-DD` string in the **local** calendar day.
 *
 * Uses local date components (not `toISOString()`, which is UTC) so a late
 * evening visit is counted under the user's own calendar day rather than the
 * next UTC one.
 *
 * @param date - The date to format.
 */
export function toLocalISODate(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

/**
 * Record a visit on the given calendar day, appending it to the distinct
 * day-set. Idempotent - a day already present is not duplicated. Returns a new
 * state object; the input is not mutated.
 *
 * @param state - Current persisted feedback state.
 * @param today - Today's date as a `YYYY-MM-DD` string.
 */
export function recordVisitDay(state: PersistedFeedbackState, today: string): PersistedFeedbackState {
	if (state.visitDays.includes(today)) return state
	return { ...state, visitDays: [...state.visitDays, today] }
}

/**
 * Decide whether the feedback prompt is eligible to show, from persisted state
 * and an injected clock. Pure - no Vue, Pinia, DOM, or ambient time.
 *
 * Eligible = visited on at least `FEEDBACK_MIN_VISIT_DAYS` distinct calendar
 * days AND has not already submitted AND is not within the dismissal cooldown.
 * The "not already shown this session" rule is session state owned by the
 * store, layered on top of this decision.
 *
 * @param state - Current persisted feedback state.
 * @param now - Current time as epoch ms.
 */
export function decideFeedbackPrompt(state: PersistedFeedbackState, now: number): boolean {
	if (state.submitted) return false
	if (state.visitDays.length < FEEDBACK_MIN_VISIT_DAYS) return false
	if (state.dismissedAt != null && now - state.dismissedAt < FEEDBACK_COOLDOWN_MS) return false
	return true
}

/** Characters Umami's collector treats as spreadsheet-formula triggers when they lead a string value. */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r']

/**
 * Prepare a free-text feedback comment for the single `feedback` analytics event.
 *
 * Trims surrounding whitespace and drops empty input (so `message` is omitted
 * rather than sent blank). If the trimmed text still begins with a
 * spreadsheet-formula trigger (`=`, `+`, `-`, `@`, tab, CR), it is prefixed with
 * a single quote so Umami's CSV-injection guard leaves the stored text intact.
 * The result is capped at `FEEDBACK_MESSAGE_MAX_LENGTH` so the guard prefix can
 * never push a full-length comment past Umami's silent-truncation boundary.
 *
 * @param raw - Raw textarea value.
 * @returns The sanitized comment, or `undefined` when there is nothing to send.
 */
export function sanitizeFeedbackMessage(raw: string): string | undefined {
	const trimmed = raw.trim()
	if (!trimmed) return undefined
	const guarded = FORMULA_TRIGGERS.includes(trimmed[0]) ? `'${trimmed}` : trimmed
	return guarded.slice(0, FEEDBACK_MESSAGE_MAX_LENGTH)
}
