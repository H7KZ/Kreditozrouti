import '@api/types'
import path from 'path'
import app from '@api/app'
import { scraper } from '@api/bullmq'
import { dragonfly, google, mysql, nodemailer } from '@api/clients'
import Config from '@api/Config/Config'
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
        await mysql.$connect()
        console.log('Connected to MySQL successfully.')

        await dragonfly.ping()
        console.log('Connected to Dragonfly successfully.')

        const accessToken = await google.getAccessToken()
        if (!accessToken?.token) throw new Error('Failed to obtain Google access token.')
        console.log('Obtained Google access token successfully.')
        google.setCredentials({ access_token: accessToken.token })

        nodemailer.build(accessToken.token)
        await nodemailer.gmail.verify()
        console.log('Nodemailer is configured and ready to send emails.')

        await scraper.schedulers()
        console.log('BullMQ schedulers are set up successfully.')

        const server = app.listen(Config.port, () => {
            console.log(`Environment: ${Config.env}`)
            console.log(`Server running on port ${Config.port}`)

            const shutdown = () => {
                console.log('Shutting down server...')

                server.close(async () => {
                    await mysql.$disconnect()
                    dragonfly.disconnect()

                    console.log('Server shut down gracefully')

                    process.exit(0)
                })
            }

            process.on('SIGTERM', shutdown)
            process.on('SIGINT', shutdown)
        })
    } catch (error) {
        console.error('Failed to start the server:', error)

        await mysql.$disconnect()
        dragonfly.disconnect()

        process.exit(1)
    }
}

start()
