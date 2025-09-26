import path from 'path'
import { PrismaClient } from '@prisma/client'
import { I18n } from 'i18n'
import { createClient as DragonflyClient } from 'redis'
import Config from '@/Config/Config'

const mysql = new PrismaClient()

const dragonfly = DragonflyClient({
    url: Config.dragonfly.uri,
    password: Config.dragonfly.password
})

const i18n = new I18n({
    locales: ['cs', 'en'],
    directory: path.join(__dirname, '../locales'),
    defaultLocale: 'en',
    objectNotation: true
})

export { mysql, dragonfly, i18n }
