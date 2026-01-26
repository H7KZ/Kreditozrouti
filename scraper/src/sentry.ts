import Config from '@scraper/Config/Config'
import * as Sentry from '@sentry/node'

Sentry.init({
    dsn: Config.sentry.dsn,
    environment: Config.env,
    release: Config.sentry.release,

    // Performance monitoring
    tracesSampleRate: Config.isEnvProduction() ? 0.1 : 1.0,

    // Attach server name for debugging
    serverName: `scraper-${process.pid}`
})

/**
 * Wraps a BullMQ job handler with Sentry error tracking.
 * Captures exceptions and adds job context to error reports.
 */
export function withSentryJobHandler<T>(jobName: string, handler: (job: T) => Promise<void>): (job: T) => Promise<void> {
    return async (job: T) => {
        const transaction = Sentry.startInactiveSpan({
            name: jobName,
            op: 'queue.process'
        })

        try {
            // Add job context
            Sentry.setContext('job', {
                name: jobName,
                id: (job as { id?: string }).id,
                data: (job as { data?: unknown }).data
            })

            await handler(job)
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    jobName,
                    jobId: (job as { id?: string }).id
                }
            })
            throw error
        } finally {
            transaction?.end()
            // Clear job context
            Sentry.setContext('job', null)
        }
    }
}

const sentry = Sentry

export default sentry
