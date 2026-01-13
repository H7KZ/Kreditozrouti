import InSISSemester from '@scraper/Types/InSISSemester'

export function extractSemester(value: string | null): InSISSemester | null {
    if (!value) return null

    value = value.toUpperCase()

    if (value.startsWith('ZS ') || value.includes(' ZS ') || value.endsWith(' ZS')) return 'ZS'

    if (value.startsWith('LS ') || value.includes(' LS ') || value.endsWith(' LS')) return 'LS'

    return null
}

export function extractYear(value: string | null): number | null {
    if (!value) return null

    const yearMatch = /(\d{4}\/\d{4})/.exec(value)

    return yearMatch ? yearMatch[1].split('/').map(y => parseInt(y, 10))[0] : null
}
