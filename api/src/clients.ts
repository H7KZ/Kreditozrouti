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
 * Nodemailer transporter for email delivery.
 * Uses Gmail SMTP if credentials are provided, otherwise creates a test transporter for development.
 */

// Debug logging for Google credentials
console.log('[Email] Config.google.user:', Config.google.user)
console.log('[Email] Config.google.appPassword:', Config.google.appPassword ? `${Config.google.appPassword.substring(0, 4)}...` : 'EMPTY')
console.log('[Email] Both credentials present:', !!(Config.google.user && Config.google.appPassword))

export const nodemailer =
    Config.google.user && Config.google.appPassword
        ? Nodemailer.createTransport({
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              requireTLS: true,
              auth: {
                  user: Config.google.user,
                  pass: Config.google.appPassword
              }
          })
        : Nodemailer.createTransport({
              streamTransport: true,
              newline: 'unix',
              buffer: true
          })

// Log which email mode is active
if (Config.google.user && Config.google.appPassword) {
    console.log('[Email] ✅ Using Gmail SMTP transport')
} else {
    console.log('[Email] ⚠️ Using test transport (emails will not be sent)')
    console.log('[Email] Reason: Missing credentials')
}
