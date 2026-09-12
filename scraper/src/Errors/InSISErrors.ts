/** Network/HTTP failure — retryable (up to 3 attempts with exponential backoff) */
export class InSISNetworkError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'InSISNetworkError'
	}
}

/** Parse failure — retryable (up to 3 attempts with exponential backoff) */
export class InSISParseError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'InSISParseError'
	}
}

/** Rate-limit response (HTTP 429) — retryable via BullMQ delayed set, not standard retry */
export class InSISRateLimitError extends Error {
	constructor(public readonly retryAfterSeconds: number) {
		super(`InSIS rate limited — retry after ${retryAfterSeconds}s`)
		this.name = 'InSISRateLimitError'
	}
}

/** Why the global outbound limiter refused to let a request through. */
export type InSISRateLimitWaitReason =
	/** A token would not become available inside INSIS_RATE_LIMIT_MAX_WAIT_MS. */
	| 'wait_cap_exceeded'
	/** The limiter itself could not be consulted (Redis unreachable / script failure). */
	| 'limiter_unavailable'

/**
 * Our own global outbound rate limiter refused the request, so it was never sent to InSIS.
 * Not retryable in-process: the caller should give up and let the next scheduled run retry.
 */
export class InSISRateLimitWaitError extends Error {
	constructor(
		public readonly reason: InSISRateLimitWaitReason,
		message: string
	) {
		super(message)
		this.name = 'InSISRateLimitWaitError'
	}
}
