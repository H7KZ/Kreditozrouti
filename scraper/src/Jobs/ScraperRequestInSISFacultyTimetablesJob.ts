import type { ScraperInSISFacultyTimetables } from '@scraper/types/insis'
import type { ScraperInSISFacultyTimetablesRequestJob } from '@scraper/types/jobs'
import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ExtractInSISFacultyTimetableService from '@scraper/Services/ExtractInSISFacultyTimetableService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'

export default async function ScraperRequestInSISFacultyTimetablesJob(
    _data: ScraperInSISFacultyTimetablesRequestJob
): Promise<ScraperInSISFacultyTimetables | null> {
    const client = createInSISClient('rozvrhy')

    const result = await client.get<string>(Config.insis.rozvrhyViewUrl)

    if (!result.success) {
        LoggerJobContext.add({ error: 'Failed to fetch faculty timetables nav', http_status: result.status })
        return null
    }

    try {
        const faculties = ExtractInSISFacultyTimetableService.extractFaculties(result.data)

        LoggerJobContext.add({ faculties_count: faculties.length })

        const data: ScraperInSISFacultyTimetables = { faculties_count: faculties.length }

        await QueueService.addFacultyTimetablesResponse(data)

        if (faculties.length > 0) {
            await QueueService.queueFacultyTimetableRequests(faculties)
        }

        return data
    } catch (error) {
        LoggerJobContext.add({ error: 'Processing error', message: (error as Error).message })
        return null
    }
}
