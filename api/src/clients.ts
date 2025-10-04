import path from 'path'
import Config from '@api/Config/Config'
import { PrismaClient } from '@prisma/client'
import { I18n } from 'i18n'
import Redis from 'ioredis'
import Nodemailer from 'nodemailer'

const mysql = new PrismaClient()

const dragonfly = new Redis(Config.dragonfly.uri, {
    password: Config.dragonfly.password,
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
    service: 'gmail',
    auth: {
        user: Config.google.user,
        pass: Config.google.appPassword
    }
})

export { mysql, dragonfly, i18n, nodemailer }
