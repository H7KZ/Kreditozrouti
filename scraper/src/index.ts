import cluster from 'cluster'
import scraper from '@scraper/bullmq'
import { redis } from '@scraper/clients'
import sentry from '@scraper/sentry'

const args = process.argv.slice(2)
const specifiedInstances = args.find(arg => !isNaN(Number(arg)))
const numWorkers = specifiedInstances ? parseInt(specifiedInstances) : 1

// Cluster management

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
    startWorker().then(() => {
        console.log(`🚀  [Scraper] Worker process ${process.pid} started`)
    })
}

// Worker startup

async function startWorker(): Promise<void> {
    try {
        await redis.ping()
        console.log('Connected to Redis successfully.')

        await scraper.waitForQueues()
        console.log('Scraper service is up and running.')
    } catch (error) {
        console.error('Failed to start the server:', error)

        if (sentry.isEnabled()) {
            sentry.captureException(error)
            await sentry.flush(2000)
        }

        redis.disconnect()
        process.exit(1)
    }
}
