import fs from 'fs'
import { nodemailer } from '@api/clients'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Paths } from '@api/paths'
import Mail from 'nodemailer/lib/mailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

/**
 * Utility service for managing email template rendering and transmission.
 */
export default class EmailService {
    /**
     * Loads an HTML template file and performs variable interpolation.
     * Replaces placeholders formatted as `{{key}}` with provided values.
     *
     * @param name - The template filename (excluding extension).
     * @param variables - A dictionary of values to inject into the template.
     * @returns The fully rendered HTML string.
     * @throws {Exception} If the template file cannot be read from the filesystem.
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
     * Transmits an email via the configured SMTP transport.
     *
     * @param data - The email configuration including recipient, subject, and content.
     * @throws {Exception} If the SMTP transaction fails.
     */
    static async sendEmail(data: Mail.Options & Partial<SMTPTransport.Options>): Promise<void> {
        try {
            await nodemailer.sendMail(data)
        } catch (err) {
            console.error('Failed to send email:', err)
            throw new Exception(500, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.EMAIL_NOT_SENT, 'Failed to send email')
        }
    }
}
