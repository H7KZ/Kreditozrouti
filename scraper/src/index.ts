import { redis } from '@scraper/clients'
import { scraper } from './bullmq'

async function start() {
    try {
        await redis.ping()
        console.log('Connected to Redis successfully.')

        await scraper.waitForQueues()
        console.log('Scraper service is up and running.')
    } catch (error) {
        console.error('Failed to start the server:', error)

        redis.disconnect()

        process.exit(1)
    }
}

start()
