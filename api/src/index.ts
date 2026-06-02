import '@api/types'
import cluster from 'cluster'
import app from '@api/app'
import { scraper } from '@api/bullmq'
import { mysql, nodemailer, redis } from '@api/clients'
import Config, { CheckRequiredEnvironmentVariables, LoadConfig } from '@api/Config/Config'
import { closeCacheInvalidationSubscriber, initCacheInvalidationSubscriber } from '@api/CacheInvalidationSubscriber'
import { logger } from '@api/logger'
import { SQLService } from '@api/Services/SQLService'

LoadConfig()

const args = process.argv.slice(2)
const specifiedInstances = args.find(arg => !isNaN(Number(arg)))
const numWorkers = specifiedInstances ? parseInt(specifiedInstances) : 1

if (cluster.isPrimary && numWorkers > 1) {
	logger.info({ pid: process.pid }, 'api.cluster_primary_started')
	logger.info({ workers: numWorkers }, 'api.forking_workers')

	for (let i = 0; i < numWorkers; i++) {
		cluster.fork()
	}

	cluster.on('exit', worker => {
		logger.warn({ pid: worker.process.pid }, 'api.worker_died_restarting')
		cluster.fork()
	})
} else {
	startWorker()
}

async function startWorker(): Promise<void> {
	try {
		CheckRequiredEnvironmentVariables(Config)

		await mysql.connection().execute(db => Promise.resolve(db))
		logger.info('mysql.connected')

		await SQLService.migrateToLatest()
		logger.info('db.migrated')

		await SQLService.seedInitialData()
		logger.info('db.seeded')

		await redis.ping()
		logger.info('redis.connected')

		await initCacheInvalidationSubscriber()
		logger.info('cache.pubsub_subscriber_ready')

		if (Config.isEmailEnabled()) {
			const mailVerified = await nodemailer.verify()
			if (!mailVerified) throw new Error('Nodemailer verification failed')
			logger.info('mailer.configured')
		}

		await scraper.waitForQueues()
		logger.info('bullmq.ready')

		await scraper.schedulers()
		logger.info('bullmq.schedulers_configured')

		const server = app.listen(Config.port, () => {
			logger.info({ port: Config.port, env: Config.env }, 'api.started')
		})

		const shutdown = () => {
			logger.info('api.shutdown')
			server.close(async () => {
				await mysql.destroy()
				await closeCacheInvalidationSubscriber()
				redis.disconnect()
				logger.info('api.stopped')
				process.exit(0)
			})
		}

		process.on('SIGTERM', shutdown)
		process.on('SIGINT', shutdown)

		logger.info({ pid: process.pid }, 'api.worker_started')
	} catch (error) {
		logger.fatal({ err: error }, 'api.startup_failed')
		await mysql.destroy()
		redis.disconnect()
		process.exit(1)
	}
}
