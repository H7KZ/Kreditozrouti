import Nodemailer from 'nodemailer'
import Config from '@api/Config/Config'

/**
 * Nodemailer transporter for email delivery.
 * Uses Gmail SMTP if credentials are provided, otherwise creates a test transporter for development.
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
