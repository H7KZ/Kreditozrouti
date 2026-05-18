import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { QueueService } from '@scraper/Services/QueueService'
import type { InSISSemester } from '@scraper/types/insis'
import type { ScraperInSISSupervisorRequestJob } from '@scraper/types/jobs'

/**
 * Annual registration window definitions — month/day boundaries only, applied to every year.
 * One week before `start` is prepended at runtime so syncing begins before the rush.
 * Source: InSIS Harmonogram (ZS typically Jun-Sep, LS typically Dec-Feb).
 */
const ANNUAL_WINDOWS: { start: string; end: string }[] = [
    // ZS: registration opens mid-June, semester ends late September
    { start: '06-15', end: '09-25' },
    // LS: registration opens early December, semester ends late February
    { start: '12-01', end: '02-28' }
]

/** How many days before the window start we begin syncing. */
const EARLY_START_DAYS = 7

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
}

function isInRegistrationWindow(): boolean {
    const today = new Date().toISOString().slice(0, 10)
    const year = today.slice(0, 4)
    const nextYear = String(Number(year) + 1)

    // Expand each annual window into concrete year-qualified ranges, covering a two-year
    // span so a Dec window that straddles year boundaries (Dec → Feb) always resolves.
    for (const w of ANNUAL_WINDOWS) {
        for (const y of [String(Number(year) - 1), year, nextYear]) {
            const rawStart = `${y}-${w.start}`
            const effectiveStart = addDays(rawStart, -EARLY_START_DAYS)

            // LS window end month (Feb) is less than start month (Dec) → end is in next year
            const endYear = w.end < w.start ? String(Number(y) + 1) : y
            const effectiveEnd = `${endYear}-${w.end}`

            if (today >= effectiveStart && today <= effectiveEnd) return true
        }
    }

    return false
}

function getCurrentSemesterInfo(): { semester: InSISSemester; year: number } {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    // ZS: Sep-Feb, LS: Mar-Aug
    if (month >= 9) return { semester: 'ZS', year }
    if (month <= 2) return { semester: 'ZS', year: year - 1 }
    return { semester: 'LS', year }
}

/**
 * Daily supervisor job.
 * Evaluates whether we are in an active registration/enrollment window
 * and dispatches a full InSIS catalog sync if so.
 * Outside registration windows, the job is a no-op to reduce InSIS load.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function ScraperRequestInSISSupervisorJob(_data: ScraperInSISSupervisorRequestJob): Promise<void> {
    if (!isInRegistrationWindow()) {
        LoggerJobContext.add({ status: 'skipped', reason: 'outside_registration_window' })
        return
    }

    const period = getCurrentSemesterInfo()
    LoggerJobContext.add({ status: 'dispatching_catalog', period })

    await QueueService.enqueueCatalogRequest({
        type: 'InSIS:Catalog',
        periods: [period],
        auto_queue_courses: true
    })
}
