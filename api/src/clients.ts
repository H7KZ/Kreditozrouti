import Config from '@api/Config/Config'
import { Database } from '@api/Database/types'
import { Paths } from '@api/paths'
import { I18n } from 'i18n'
import Redis from 'ioredis'
import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'
import Nodemailer from 'nodemailer'

/**
 * Configures the MySQL dialect with a connection pool.
 * Sets timezone to UTC ('Z') and a high connection limit.
 */
const dialect = new MysqlDialect({
    pool: createPool({
        uri: Config.mysql.uri,

        timezone: 'Z',
        connectionLimit: 500,
        connectTimeout: 60 // seconds
    })
})

/**
 * The Kysely instance for type-safe MySQL database interactions.
 * Initialized with the application's database schema type definition.
 */
const mysql = new Kysely<Database>({ dialect })

/**
 * The Redis client instance.
 * Configured with `maxRetriesPerRequest: null` to support BullMQ requirements.
 */
const redis = new Redis(Config.redis.uri, {
    password: Config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
})

/**
 * The internationalization (i18n) instance.
 * Configured for Czech ('cs') and English ('en') locales using the defined directory path.
 */
const i18n = new I18n({
    locales: ['cs', 'en'],
    directory: Paths.I18n,
    defaultLocale: 'en',
    objectNotation: true
})

/**
 * The Nodemailer transporter instance.
 * Configured to send emails via Gmail SMTP using application credentials.
 */
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
