import { redis } from '@scraper/clients'
import { scraper } from './bullmq'

/**
 * Scraper service entry point.
 * Verifies Redis connectivity and initializes BullMQ job queues and workers.
 */
async function start() {
    try {
        /**
         * Checks the connection to the Redis instance.
         */
        await redis.ping()
        console.log('Connected to Redis successfully.')

        /**
         * Initializes the scraper queues and waits for workers to be ready.
         */
        await scraper.waitForQueues()
        console.log('Scraper service is up and running.')
    } catch (error) {
        console.error('Failed to start the server:', error)

        redis.disconnect()

        process.exit(1)
    }
}

start()
