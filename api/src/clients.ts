import path from 'path'
import Config from '@api/Config/Config'
import { Database } from '@api/Database/types'
import { I18n } from 'i18n'
import Redis from 'ioredis'
import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'
import Nodemailer from 'nodemailer'

const dialect = new MysqlDialect({
    pool: createPool({
        uri: Config.mysql.uri,

        timezone: 'Z',
        connectionLimit: 500,
        connectTimeout: 60 // seconds
    })
})

const mysql = new Kysely<Database>({ dialect })

const redis = new Redis(Config.redis.uri, {
    password: Config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
})

const i18n = new I18n({
    locales: ['cs', 'en'],
    directory: path.join(__dirname, '../locales'),
    defaultLocale: 'en',
    objectNotation: true
})

const nodemailer = Nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: Config.google.user,
        pass: Config.google.appPassword
    }
})

export { mysql, redis, i18n, nodemailer }
