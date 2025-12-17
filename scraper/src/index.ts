import cluster from 'cluster'
import { redis } from '@scraper/clients'
import { scraper } from './bullmq'

const args = process.argv.slice(2)
const specifiedInstances = args.find(arg => !isNaN(Number(arg)))
const numWorkers = specifiedInstances ? parseInt(specifiedInstances) : 1

if (cluster.isPrimary && numWorkers > 1) {
    console.log(`🚀  [Scraper] Master process ${process.pid} is running`)
    console.log(`⚙️  [Scraper] Forking ${numWorkers} workers...`)

    for (let i = 0; i < numWorkers; i++) {
        cluster.fork()
    }

    cluster.on('exit', worker => {
        console.log(`❌  [Scraper] Worker ${worker.process.pid} died. Restarting...`)
        cluster.fork()
    })
} else {
    start().then(() => {
        console.log(`🚀  [Scraper] Worker process ${process.pid} started`)
    })
}

/**
 * Scraper service entry point.
 * Verifies Redis connectivity and initializes BullMQ job queues and workers.
 */
async function start() {
    try {
        // Checks the connection to the Redis instance.
        await redis.ping()
        console.log('Connected to Redis successfully.')

        // Initializes the scraper queues and waits for workers to be ready.
        await scraper.waitForQueues()
        console.log('Scraper service is up and running.')
    } catch (error) {
        console.error('Failed to start the server:', error)

        redis.disconnect()

        process.exit(1)
    }
}
