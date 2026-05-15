import { UnrecoverableError } from 'bullmq'

/** Network/HTTP failure — retryable (up to 3 attempts with exponential backoff) */
export class InSISNetworkError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InSISNetworkError'
    }
}

/** Parse failure — deterministic, bypasses retry queue (extends UnrecoverableError) */
export class InSISParseError extends UnrecoverableError {
    constructor(message: string) {
        super(message)
        this.name = 'InSISParseError'
    }
}
