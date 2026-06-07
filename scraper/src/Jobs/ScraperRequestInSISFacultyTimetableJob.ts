import type { ScraperInSISFacultyTimetable } from '@scraper/types/insis'
import type { ScraperInSISFacultyTimetableRequestJob } from '@scraper/types/jobs'
import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { InSISRateLimitError } from '@scraper/Errors/InSISErrors'
import ExtractInSISFacultyTimetableService from '@scraper/Services/ExtractInSISFacultyTimetableService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'

export default async function ScraperRequestInSISFacultyTimetableJob(
    data: ScraperInSISFacultyTimetableRequestJob
): Promise<ScraperInSISFacultyTimetable | null> {
    const client = createInSISClient('rozvrhy_faculty')

    LoggerJobContext.add({ f_id: data.f_id, faculty_name: data.name })

    const url = `${Config.insis.rozvrhyViewUrl}?konf=1;f=${data.f_id}`
    const result = await client.get<string>(url)

    if (!result.success) {
        if (result.status === 429) throw new InSISRateLimitError(result.retryAfter ?? 60)
        LoggerJobContext.add({ error: 'Failed to fetch faculty timetable page', http_status: result.status })
        return null
    }

    try {
        const { ident, max_year } = ExtractInSISFacultyTimetableService.extractFacultyTimetable(result.data)

        if (!ident) {
            LoggerJobContext.add({ warning: 'No faculty ident found in timetable page' })
            return null
        }

        const is_schedule_publicly_visible = ExtractInSISFacultyTimetableService.isPubliclyVisible(max_year)

        const timetable: ScraperInSISFacultyTimetable = { ident, is_schedule_publicly_visible }

        LoggerJobContext.add({ ident, max_year, is_schedule_publicly_visible })

        await QueueService.addFacultyTimetableResponse(timetable)

        return timetable
    } catch (error) {
        LoggerJobContext.add({ error: 'Extraction error', message: (error as Error).message })
        return null
    }
}
