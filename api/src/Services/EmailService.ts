import fs from 'fs'
import { nodemailer } from '@api/clients'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import { Paths } from '@api/paths'
import Mail from 'nodemailer/lib/mailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

/**
 * Service for managing email template rendering and SMTP transmission.
 */
export default class EmailService {
    /**
     * Reads an HTML template and interpolates variables.
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
     * Sends an email using the configured NodeMailer transport.
     *
     * @param data - Mail options (to, subject, html/text body).
     * @throws {Exception} 500 - If the email fails to send.
     */
    static async sendEmail(data: Mail.Options & Partial<SMTPTransport.Options>): Promise<void> {
        try {
            console.log(`[EmailService] Sending email to: ${String(data.to)}`)
            console.log(`[EmailService] Subject: ${data.subject}`)
            console.log(`[EmailService] From: ${data.from}`)

            const result = await nodemailer.sendMail(data)

            console.log(`[EmailService] ✅ Email sent successfully`)
            console.log(`[EmailService] ==================== FULL SMTP RESPONSE ====================`)
            console.log(JSON.stringify(result, null, 2))
            console.log(`[EmailService] ============================================================`)
            console.log(`[EmailService] Message ID: ${result.messageId}`)
            console.log(`[EmailService] Response: ${result.response}`)
            console.log(`[EmailService] Accepted: ${JSON.stringify(result.accepted)}`)
            console.log(`[EmailService] Rejected: ${JSON.stringify(result.rejected)}`)
            console.log(`[EmailService] Pending: ${JSON.stringify(result.pending)}`)
            console.log(`[EmailService] Envelope: ${JSON.stringify(result.envelope)}`)
        } catch (err) {
            console.error('[EmailService] ❌ Failed to send email:', err)
            console.error('[EmailService] Full error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
            throw new Exception(500, ErrorTypeEnum.UNKNOWN, ErrorCodeEnum.EMAIL_NOT_SENT, 'Failed to send email')
        }
    }
}
