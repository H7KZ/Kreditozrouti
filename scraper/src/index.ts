import { dragonfly } from '$scraper/clients'

async function start() {
    try {
        await dragonfly.ping()
        console.log('Connected to Dragonfly successfully.')
    } catch (error) {
        console.error('Failed to start the server:', error)

        dragonfly.disconnect()

        process.exit(1)
    }
}

start()
