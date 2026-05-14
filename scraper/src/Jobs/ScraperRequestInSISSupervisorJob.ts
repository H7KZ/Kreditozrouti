import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { QueueService } from '@scraper/Services/QueueService'
import type { ScraperInSISSupervisorRequestJob } from '@scraper/types/jobs'
import type { InSISSemester } from '@scraper/types/insis'

/**
 * Registration windows: date ranges when InSIS data changes heavily.
 * Outside these windows, syllabus changes are rare — no full catalog sync needed.
 * Source: InSIS Harmonogram (ZS typically Jun-Sep, LS typically Dec-Feb).
 */
const REGISTRATION_WINDOWS: Array<{ start: string; end: string }> = [
    // ZS 2025/2026
    { start: '2025-06-15', end: '2025-09-25' },
    // LS 2025/2026
    { start: '2025-12-01', end: '2026-02-28' },
    // ZS 2026/2027
    { start: '2026-06-15', end: '2026-09-25' },
    // LS 2026/2027
    { start: '2026-12-01', end: '2027-02-28' },
    // ZS 2027/2028
    { start: '2027-06-15', end: '2027-09-25' },
    // LS 2027/2028
    { start: '2027-12-01', end: '2028-02-28' },
]

const MAX_KNOWN_WINDOW_END = REGISTRATION_WINDOWS[REGISTRATION_WINDOWS.length - 1]?.end ?? '2000-01-01'

function isInRegistrationWindow(): boolean {
    const today = new Date().toISOString().slice(0, 10)

    // Past all known windows — fail open with a loud warning so the missing
    // dates get noticed rather than silently stopping all catalog syncs.
    if (today > MAX_KNOWN_WINDOW_END) {
        console.error(
            `[Supervisor] WARNING: today (${today}) is past all known registration windows ` +
            `(last: ${MAX_KNOWN_WINDOW_END}). Update REGISTRATION_WINDOWS in ` +
            `ScraperRequestInSISSupervisorJob.ts. Defaulting to SYNC to avoid data staleness.`
        )
        return true
    }

    return REGISTRATION_WINDOWS.some(w => today >= w.start && today <= w.end)
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
