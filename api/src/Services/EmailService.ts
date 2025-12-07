import fs from 'fs'
import { nodemailer } from '@api/clients'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Paths } from '@api/paths'
import Mail from 'nodemailer/lib/mailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

export default class EmailService {
    /**
     * Reads an email template and replaces variables in the format {{variable}} with provided values
     * Returns the final HTML string
     *
     * @param name Template name without .html extension
     * @param variables Variables to replace in the template
     * @returns The email template HTML with variables replaced
     * @throws Exception if reading the template fails
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
     * Sends an email using nodemailer
     *
     * @param data Mail options and SMTP transport options
     * @throws Exception if sending the email fails
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
