/**
 * Maximum stored length of a feedback comment. Umami silently truncates event
 * strings beyond 500 chars, so the textarea caps input here and this util keeps
 * its output within the same bound - the user sees exactly what will be stored.
 */
export const FEEDBACK_MESSAGE_MAX_LENGTH = 500

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
