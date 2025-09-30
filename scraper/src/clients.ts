import Redis from 'ioredis'
import Config from '@/Config/Config'

const dragonfly = new Redis(Config.dragonfly.uri, {
    password: Config.dragonfly.password
})

export { dragonfly }
