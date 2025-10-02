import fs from 'fs'
import path from 'path'
import { nodemailer } from '$api/clients'
import { ErrorCodeEnum, ErrorTypeEnum } from '$api/Enums/ErrorEnum'
import { Exception } from '$api/Interfaces/ErrorInterface'
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
            template = await fs.promises.readFile(path.join(__dirname, `../Emails/${name}.html`), 'utf-8')
        } catch {
            throw new Exception(500, ErrorTypeEnum.Unknown, ErrorCodeEnum.InternalServerError, 'Failed to read email template')
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
            await nodemailer.gmail.sendMail(data)
        } catch (err) {
            console.error('Failed to send email:', err)
            throw new Exception(500, ErrorTypeEnum.Unknown, ErrorCodeEnum.EmailNotSent, 'Failed to send email')
        }
    }
}
