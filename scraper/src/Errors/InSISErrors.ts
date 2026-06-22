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
