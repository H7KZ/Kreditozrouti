import Config from '$scraper/Config/Config'
import Redis from 'ioredis'

const dragonfly = new Redis(Config.dragonfly.uri, {
    password: Config.dragonfly.password
})

export { dragonfly }
