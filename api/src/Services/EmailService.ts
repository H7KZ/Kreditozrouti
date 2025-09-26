import fs from 'fs'
import path from 'path'
import Config from '@/Config/Config'
import { ErrorCodeEnum, ErrorTypeEnum } from '@/Enums/ErrorEnum'
import { Exception } from '@/Interfaces/ErrorInterface'

export default class EmailService {
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

    static async sendEmail(data: { to: string; subject: string; html: string }): Promise<void> {
        try {
            // TODO implement Gmail SMTP
        } catch {
            throw new Exception(500, ErrorTypeEnum.Unknown, ErrorCodeEnum.EmailNotSent, 'Failed to send email')
        }
    }
}
