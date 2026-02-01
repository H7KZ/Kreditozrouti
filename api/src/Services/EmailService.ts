import fs from 'fs'
import { nodemailer } from '@api/clients'
import Config from '@api/Config/Config'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Paths } from '@api/paths'
import Mail from 'nodemailer/lib/mailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

/**
 * Service for managing email template rendering and SMTP transmission.
 * Abstraction layer over NodeMailer.
 */
export default class EmailService {
	/**
	 * Reads an HTML template from disk and interpolates variables.
	 * Replaces `{{key}}` placeholders with values from the variables object.
	 *
	 * @param name - The name of the template file (without extension).
	 * @param variables - Key-value pairs to inject into the template.
	 * @throws {Exception} 500 - If the template file cannot be read.
	 */
	static async readTemplate(name: string, variables: Record<string, string>): Promise<string> {
		let template: string

		try {
			template = await fs.promises.readFile(Paths.Emails.htmlTemplate(name), 'utf-8')
		} catch {
			throw new Exception(500, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.INTERNAL_SERVER_ERROR, 'Failed to read email template')
		}

		for (const [key, value] of Object.entries(variables)) {
			template = template.replace(new RegExp(`{{${key}}}`, 'g'), value)
		}

		return template
	}

	/**
	 * Sends an email using the globally configured NodeMailer transport.
	 *
	 * @param data - Mail options (to, subject, html/text body).
	 * @returns boolean - True if sent, false if email is disabled in config.
	 * @throws {Exception} 500 - If the email fails to send.
	 */
	static async sendEmail(data: Mail.Options & Partial<SMTPTransport.Options>): Promise<boolean> {
		if (!Config.isEmailEnabled()) return false

		try {
			await nodemailer.sendMail(data)

			return true
		} catch {
			throw new Exception(500, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.EMAIL_NOT_SENT, 'Failed to send email')
		}
	}

	/**
	 * Helper to format email address strings (supports string, array, or object formats).
	 * Used primarily for logging or debugging address lists.
	 */
	private static formatAddress(val: Mail.Options['to']): string {
		if (!val) return ''

		const items = Array.isArray(val) ? val : [val]

		return items
			.map(item => {
				if (typeof item === 'string') return item
				const anyItem = item as { address?: string; name?: string; toString?: () => string }
				const addr = anyItem.address ?? anyItem.toString?.() ?? ''
				return anyItem.name ? `${anyItem.name} <${addr}>` : addr
			})
			.filter(Boolean)
			.join(', ')
	}
}
