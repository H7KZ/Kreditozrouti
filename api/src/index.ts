import { User as UserModel } from '@prisma/client'
import app from '@/app'
import { dragonfly, google, mysql, nodemailer } from '@/clients'
import Config from '@/Config/Config'

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface User extends UserModel {}
    }
}

async function start() {
    try {
        await mysql.$connect()
        console.log('Connected to MySQL successfully.')

        await dragonfly.connect()
        console.log('Connected to Dragonfly successfully.')

        const accessToken = await google.getAccessToken()
        if (!accessToken?.token) throw new Error('Failed to obtain Google access token.')
        console.log('Obtained Google access token successfully.')
        google.setCredentials({ access_token: accessToken.token })

        nodemailer.build(accessToken.token)
        await nodemailer.gmail.verify()
        console.log('Nodemailer is configured and ready to send emails.')

        const server = app.listen(Config.port, () => {
            console.log(`Environment: ${Config.env}`)
            console.log(`Server running on port ${Config.port}`)

            const shutdown = () => {
                console.log('Shutting down server...')

                server.close(async () => {
                    await mysql.$disconnect()
                    if (dragonfly.isOpen) await dragonfly.close()

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
        if (dragonfly.isOpen) await dragonfly.close()

        process.exit(1)
    }
}

start()
