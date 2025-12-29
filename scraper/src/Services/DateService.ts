import moment from 'moment'

/**
 * Service for parsing and normalizing date and time strings.
 */
export default class DateService {
    private static dateFormats = [
        'D. M. YYYY',
        'D. M. YY',
        'D. M. Y',
        'D. M.',
        'DD. MM. YYYY',
        'DD. MM. YY',
        'DD. MM. Y',
        'DD. MM.',

        'D.M.YYYY',
        'D.M.YY',
        'D.M.Y',
        'D.M.',
        'DD.MM.YYYY',
        'DD.MM.YY',
        'DD.MM.Y',
        'DD.MM.',

        'YYYY-MM-DD',
        'YY-MM-DD',
        'Y-M-D',
        'MM-DD-YYYY',
        'MM-DD-YY',
        'MM-DD-Y',
        'MM-DD.',

        'YYYY/MM/DD',
        'YY/MM/DD',
        'Y/M/D',
        'MM/DD/YYYY',
        'MM/DD/YY',
        'MM/DD/Y',
        'MM/DD.',

        'D-M-YYYY',
        'D-M-YY',
        'D-M-Y',
        'D-M',
        'DD-MM-YYYY',
        'DD-MM-YY',
        'DD-MM-Y',
        'DD-MM.',

        'D/M/YYYY',
        'D/M/YY',
        'D/M/Y',
        'D/M',
        'DD/MM/YYYY',
        'DD/MM/YY',
        'DD/MM/Y',
        'DD/MM.'
    ]

    private static timeFormats = ['H:mm', 'HH:mm']

    /**
     * Extracts date and time from a given string.
     *
     * @param text The input string containing date and/or time.
     * @returns An object containing the extracted datetime, date, and time.
     */
    static extractDateTimeFromString(text: string): { datetime: Date | null; date: Date | null; time: string | null } {
        if (!text) {
            return {
                datetime: null,
                date: null,
                time: null
            }
        }

        const cleanText = text.replace(/\s+/g, ' ').trim()

        const date = moment(cleanText, this.dateFormats).utcOffset('Europe/Prague')

        if (!date.isValid()) {
            return {
                datetime: null,
                date: null,
                time: null
            }
        }

        const textWithoutDate = this.dateFormats.reduce((acc, format) => acc.replace(date.format(format), ''), cleanText).trim()

        const time = moment(textWithoutDate, this.timeFormats).utcOffset('Europe/Prague')

        const timeString = time.isValid() ? time.format('HH:mm') : '00:00'

        const datetime = moment(`${date.format('YYYY-MM-DD')}T${timeString}`).utcOffset('Europe/Prague')

        return {
            datetime: datetime.isValid() ? datetime.toDate() : null,
            date: date.isValid() ? date.toDate() : null,
            time: time.isValid() ? time.format('HH:mm') : null
        }
    }

    /**
     * Helper to parse Flickr specific date strings into a Date object.
     * Handles ranges (e.g., "2024/06/21-24") and partial dates (Year or Year-Month).
     *
     * @param text - The raw date string from a Flickr title (e.g. "2025/11/25")
     * @returns A Date object or null
     */
    static extractDateFromFlickrString(text: string): Date | null {
        try {
            if (!text) return null

            let cleanText = text.trim()

            // Handle date ranges: "2024/06/21-24" -> "2024/06/21"
            if (cleanText.includes('-') && cleanText.length > 10) {
                const parts = cleanText.split('-')
                if (parts[0].length >= 8) {
                    cleanText = parts[0]
                }
            }

            // Normalize separators: 2025/11/25 -> 2025-11-25
            cleanText = cleanText.replace(/[./]/g, '-')

            // Handle "Year only": "2025" -> "2025-01-01"
            if (/^\d{4}$/.test(cleanText)) {
                return moment(`${cleanText}-01-01`).utcOffset('Europe/Prague').toDate()
            }

            // Handle "Year-Month": "2016-09" -> "2016-09-01"
            if (/^\d{4}-\d{2}$/.test(cleanText)) {
                return moment(`${cleanText}-01`).utcOffset('Europe/Prague').toDate()
            }

            const datetime = this.extractDateTimeFromString(cleanText)

            return datetime.date
        } catch {
            return null
        }
    }
}
