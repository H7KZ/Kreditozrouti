import moment from 'moment'

/**
 * Service for parsing and normalizing date and time strings.
 */
export default class DateService {
    private static readonly DATE_FORMATS = [
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

    private static readonly TIME_FORMATS = ['H:mm', 'HH:mm']

    /**
     * Extracts date and time from a given string.
     */
    static extractDateTimeFromString(text: string): { datetime: Date | null; date: Date | null; time: string | null } {
        if (!text) return { datetime: null, date: null, time: null }

        const cleanText = text.replace(/\s+/g, ' ').trim()
        const date = moment(cleanText, this.DATE_FORMATS).utcOffset('Europe/Prague')

        if (!date.isValid()) return { datetime: null, date: null, time: null }

        const textWithoutDate = this.DATE_FORMATS.reduce((acc, format) => acc.replace(date.format(format), ''), cleanText).trim()
        const time = moment(textWithoutDate, this.TIME_FORMATS).utcOffset('Europe/Prague')
        const timeString = time.isValid() ? time.format('HH:mm') : '00:00'

        const datetime = moment(`${date.format('YYYY-MM-DD')}T${timeString}`).utcOffset('Europe/Prague')

        return {
            datetime: datetime.isValid() ? datetime.toDate() : null,
            date: date.isValid() ? date.toDate() : null,
            time: time.isValid() ? time.format('HH:mm') : null
        }
    }
}
