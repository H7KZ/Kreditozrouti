/**
 * Simple logger wrapper to prefix messages with context.
 */
export default class LoggerService {
    private readonly prefix: string

    constructor(prefix: string | null = null) {
        if (!prefix) {
            this.prefix = ''
        } else {
            this.prefix = prefix
        }
    }

    log(message: string) {
        console.log(`${this.prefix} ${message}`)
    }

    info(message: string | object) {
        if (typeof message === 'object') {
            message = JSON.stringify(message)
        }

        console.info(`${this.prefix} ${message}`)
    }

    warn(message: string) {
        console.warn(`${this.prefix} ${message}`)
    }

    error(message: string | object, error?: Error | unknown) {
        if (typeof message === 'object') {
            message = JSON.stringify(message)
        }

        console.error(`${this.prefix} ${message}`)

        if (error) console.error(error)
    }
}
