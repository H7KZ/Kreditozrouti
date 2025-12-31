import path from 'path'

/**
 * Static utility for resolving absolute file paths.
 * Centralizes directory structure logic.
 */
export class Paths {
    static root = path.resolve(__dirname, '../')
    static src = path.join(Paths.root, 'src')
    static assets = path.join(Paths.root, 'assets')

    static Database = {
        migrations: path.join(Paths.src, 'Database', 'migrations'),
        seeds: path.join(Paths.src, 'Database', 'seeds')
    }

    static I18n = path.join(Paths.src, 'I18n')

    static Emails = {
        htmlTemplate(name: string): string {
            return path.join(Paths.src, 'Emails', `${name}.html`)
        }
    }
}
