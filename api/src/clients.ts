import Config from '@api/Config/Config'
import { Database } from '@api/Database/types'
import { Paths } from '@api/paths'
import { I18n } from 'i18n'
import Redis from 'ioredis'
import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'
import Nodemailer from 'nodemailer'

/**
 * Kysely instance for type-safe MySQL interactions.
 * Configured with a connection pool (500 connections, UTC timezone).
 */
const dialect = new MysqlDialect({
    pool: createPool({
        uri: Config.mysql.uri,
        timezone: 'Z',
        connectionLimit: 500,
        connectTimeout: 60
    })
})

export const mysql = new Kysely<Database>({ dialect })

/**
 * Redis client instance.
 * Configured with `maxRetriesPerRequest: null` to adhere to BullMQ requirements.
 */
export const redis = new Redis(Config.redis.uri, {
    password: Config.redis.password,
    maxRetriesPerRequest: null
})

/**
 * Internationalization (i18n) instance.
 * Supports 'cs' and 'en' locales.
 */
export const i18n = new I18n({
    locales: ['cs', 'en'],
    directory: Paths.I18n,
    defaultLocale: 'en',
    objectNotation: true
})

/**
 * Nodemailer transporter for email delivery via Gmail.
 */
export const nodemailer = Nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: Config.google.user,
        pass: Config.google.appPassword
    }
})
