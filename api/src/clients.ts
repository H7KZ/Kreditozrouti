import path from 'path'
import Config from '$api/Config/Config'
import { PrismaClient } from '$prisma/client'
import { google as Google } from 'googleapis'
import { I18n } from 'i18n'
import Redis from 'ioredis'
import Nodemailer from 'nodemailer'

const mysql = new PrismaClient()

const dragonfly = new Redis(Config.dragonfly.uri, {
    password: Config.dragonfly.password
})

const i18n = new I18n({
    locales: ['cs', 'en'],
    directory: path.join(__dirname, '../locales'),
    defaultLocale: 'en',
    objectNotation: true
})

const google = new Google.auth.OAuth2(Config.google.clientId, Config.google.clientSecret)
google.setCredentials({ refresh_token: Config.google.refreshToken })

class NodemailerClient {
    public gmail!: Nodemailer.Transporter

    build(accessToken: string) {
        this.gmail = Nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: Config.google.email,
                clientId: Config.google.clientId,
                clientSecret: Config.google.clientSecret,
                refreshToken: Config.google.refreshToken,
                accessToken
            }
        })

        return this.gmail
    }
}

const nodemailer = new NodemailerClient()

export { mysql, dragonfly, i18n, google, nodemailer }
