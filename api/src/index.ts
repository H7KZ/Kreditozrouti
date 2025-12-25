import '@api/types'
import app from '@api/app'
import { scraper } from '@api/bullmq'
import { mysql, nodemailer, redis } from '@api/clients'
import Config from '@api/Config/Config'
import { SQLService } from '@api/Services/SQLService'

start()

/**
 * Application entry point.
 * Initializes infrastructure connections, executes migrations, sets up background jobs, and starts the HTTP server.
 */
async function start() {
    try {
        /**
         * Verifies the connection to the MySQL database.
         */
        await mysql.connection().execute(db => Promise.resolve(db))
        console.log('Connected to MySQL successfully.')

        /**
         * Executes pending schema migrations.
         */
        await SQLService.migrateToLatest()
        console.log('Migrating connection to MySQL successfully.')

        /**
         * Populates the database with initial seed data.
         */
        await SQLService.seedInitialData()
        console.log('Seeding initial data to MySQL successfully.')

        /**
         * Verifies the connection to the Redis cache instance.
         */
        await redis.ping()
        console.log('Connected to Redis successfully.')

        /**
         * Verifies SMTP configuration for email delivery.
         */
        const mailVerified = await nodemailer.verify()
        if (!mailVerified) throw new Error('Nodemailer verification failed')
        console.log('Nodemailer is configured and ready to send emails.')

        /**
         * Initializes job queues and waits for workers to be ready.
         */
        await scraper.waitForQueues()
        console.log('BullMQ queues and workers are ready.')

        /**
         * Configures periodic job schedulers (Cron).
         */
        await scraper.schedulers()
        console.log('BullMQ schedulers are set up successfully.')

        /**
         * Binds the Express application to the configured port.
         */
        const server = app.listen(Config.port, () => {
            console.log(`Environment: ${Config.env}`)
            console.log(`Server running on port ${Config.port}`)

            /**
             * Handles graceful shutdown sequences on termination signals (SIGINT/SIGTERM).
             * Stops the server and disconnects database clients before exiting.
             */
            const shutdown = () => {
                console.log('Shutting down server...')

                server.close(async () => {
                    await mysql.destroy()
                    redis.disconnect()

                    console.log('Server shut down gracefully')

                    process.exit(0)
                })
            }

            process.on('SIGTERM', shutdown)
            process.on('SIGINT', shutdown)
        })
    } catch (error) {
        console.error('Failed to start the server:', error)

        await mysql.destroy()
        redis.disconnect()

        process.exit(1)
    }
}
