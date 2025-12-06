import moment from 'moment'

export default class ExtractService {
    static extractDateTimeFromString(text: string): { datetime: Date | null; date: Date | null; time: string | null } {
        if (!text) {
            return {
                datetime: null,
                date: null,
                time: null
            }
        }

        const date = moment(text.replace(/[,\s]+/, ' ').trim(), [
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
            'DD.MM.'
        ]).utcOffset('Europe/Prague')

        const time = moment(
            text
                .replace(date.format('D. M. YYYY'), '')
                .replace(date.format('D. M. YY'), '')
                .replace(date.format('D. M. Y'), '')
                .replace(date.format('D. M.'), '')
                .replace(date.format('DD. MM. YYYY'), '')
                .replace(date.format('DD. MM. YY'), '')
                .replace(date.format('DD. MM. Y'), '')
                .replace(date.format('DD. MM.'), '')
                .replace(date.format('D.M.YYYY'), '')
                .replace(date.format('D.M.YY'), '')
                .replace(date.format('D.M.Y'), '')
                .replace(date.format('D.M.'), '')
                .replace(date.format('DD.MM.YYYY'), '')
                .replace(date.format('DD.MM.YY'), '')
                .replace(date.format('DD.MM.Y'), '')
                .replace(date.format('DD.MM.'), '')
                .replace(/[,\s]+/, ' ')
                .trim(),
            ['H:mm', 'HH:mm']
        ).utcOffset('Europe/Prague')

        const datetime = moment(`${date.format('YYYY-MM-DD')}T${time.format('HH:mm')}`).utcOffset('Europe/Prague')

        return {
            datetime: datetime.isValid() ? datetime.toDate() : null,
            date: date.isValid() ? date.toDate() : null,
            time: time.isValid() ? time.format('HH:mm') : null
        }
    }

    static serializeValue(value: string | null): string | null {
        if (!value) return null

        return value.replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('\t', ' ').replace(/\s+/g, ' ').trim()
    }
}
