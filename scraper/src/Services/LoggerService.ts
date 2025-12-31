/**
 * Simple logger wrapper to prefix messages with context.
 */
export default class LoggerService {
    private readonly prefix: string

    constructor(prefix: string) {
        this.prefix = prefix
    }

    log(message: string) {
        console.log(`${this.prefix} ${message}`)
    }

    warn(message: string) {
        console.warn(`${this.prefix} ${message}`)
    }

    error(message: string, error?: Error | unknown) {
        console.error(`${this.prefix} ${message}`)
        if (error) console.error(error)
    }
}
