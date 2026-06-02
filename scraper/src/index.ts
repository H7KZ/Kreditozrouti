import cluster from 'cluster'
import scraper from '@scraper/bullmq'
import { redis } from '@scraper/clients'
import { logger } from '@scraper/logger'

const args = process.argv.slice(2)
const specifiedInstances = args.find(arg => !isNaN(Number(arg)))
const numWorkers = specifiedInstances ? parseInt(specifiedInstances) : 1

// Cluster management

if (cluster.isPrimary && numWorkers > 1) {
	logger.info({ pid: process.pid }, 'scraper.cluster_primary_started')
	logger.info({ workers: numWorkers }, 'scraper.forking_workers')

	for (let i = 0; i < numWorkers; i++) {
		cluster.fork()
	}

	cluster.on('exit', worker => {
		logger.warn({ pid: worker.process.pid }, 'scraper.worker_died_restarting')
		cluster.fork()
	})
} else {
	startWorker().then(() => {
		logger.info({ pid: process.pid }, 'scraper.worker_started')
	})
}

// Worker startup

async function startWorker(): Promise<void> {
	try {
		await redis.ping()
		logger.info('redis.connected')

		scraper.init()
		await scraper.waitForQueues()
		logger.info('scraper.ready')
	} catch (error) {
		logger.fatal({ err: error }, 'scraper.startup_failed')
		redis.disconnect()
		process.exit(1)
	}
}
