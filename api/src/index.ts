import '@api/types'
import path from 'path'
import app from '@api/app'
import { scraper } from '@api/bullmq'
import { mysql, nodemailer, redis } from '@api/clients'
import Config from '@api/Config/Config'
import { MySQLService } from '@api/Services/MySQLService'
import dotenv from 'dotenv'

try {
    dotenv.config({
        path: [
            path.resolve(process.cwd(), '../../../.env'), // For dist folder
            path.resolve(process.cwd(), '../.env'), // For monorepo root
            path.resolve(process.cwd(), '.env') // For monorepo package
        ]
    })
} catch {
    console.warn('No .env file found')
}

async function start() {
    try {
        await mysql.connection().execute(db => Promise.resolve(db))
        console.log('Connected to MySQL successfully.')

        await MySQLService.migrateToLatest(mysql)

        await redis.ping()
        console.log('Connected to Redis successfully.')

        const mailVerified = await nodemailer.verify()
        if (!mailVerified) throw new Error('Nodemailer verification failed')
        console.log('Nodemailer is configured and ready to send emails.')

        await scraper.waitForQueues()
        console.log('BullMQ queues and workers are ready.')

        await scraper.schedulers()
        console.log('BullMQ schedulers are set up successfully.')

        await scraper.setConcurrency(8)
        console.log('BullMQ global concurrency set to 8.')

        const server = app.listen(Config.port, () => {
            console.log(`Environment: ${Config.env}`)
            console.log(`Server running on port ${Config.port}`)

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

start()
