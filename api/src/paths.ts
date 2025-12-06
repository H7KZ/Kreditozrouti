import path from 'path'

/**
 * Static utility class for resolving absolute file paths throughout the application.
 * Centralizes directory structure logic to ensure consistent path resolution.
 */
export class Paths {
    /** The absolute path to the project root directory. */
    static root = path.resolve(__dirname, '../')

    /** The absolute path to the source code directory. */
    static src = path.join(Paths.root, 'src')
    /** The absolute path to the static assets directory. */
    static assets = path.join(Paths.root, 'assets')

    /** Database configuration paths. */
    static Database = {
        /** Directory containing Kysely schema migration files. */
        migrations: path.join(Paths.src, 'Database', 'migrations'),
        /** Directory containing initial data seed scripts. */
        seeds: path.join(Paths.src, 'Database', 'seeds')
    }

    /** Directory containing internationalization (i18n) locale files. */
    static I18n = path.join(Paths.src, 'I18n')

    /** Email template path helpers. */
    static Emails = {
        /**
         * Resolves the full path for a named HTML email template.
         *
         * @param name - The filename of the template (excluding extension).
         * @returns The absolute path to the .html template file.
         */
        htmlTemplate(name: string): string {
            return path.join(Paths.src, 'Emails', `${name}.html`)
        }
    }
}
