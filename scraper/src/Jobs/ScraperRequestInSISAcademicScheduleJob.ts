import type { ScraperInSISAcademicSchedule } from '@scraper/types/insis'
import type { ScraperInSISAcademicScheduleRequestJob } from '@scraper/types/jobs'
import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ExtractInSISAcademicScheduleService from '@scraper/Services/ExtractInSISAcademicScheduleService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'

export default async function ScraperRequestInSISAcademicScheduleJob(data: ScraperInSISAcademicScheduleRequestJob): Promise<ScraperInSISAcademicSchedule | null> {
    const client = createInSISClient('harmonogram_period')

    LoggerJobContext.add({
        insis_period_id: data.insis_period_id,
        faculty_ident: data.faculty_ident
    })

    const url = `${Config.insis.harmonogramUrl}?obdobi=${data.insis_period_id}&fakulta=${data.insis_faculty_id}`
    const result = await client.get<string>(url)

    if (!result.success) {
        LoggerJobContext.add({ error: 'Failed to fetch period schedule', http_status: result.status })
        return null
    }

    try {
        const events = ExtractInSISAcademicScheduleService.extractEvents(result.data)

        const schedule: ScraperInSISAcademicSchedule = {
            insis_period_id: data.insis_period_id,
            faculty_ident: data.faculty_ident,
            semester: data.semester,
            year: data.year,
            level: data.level,
            starts_at: data.starts_at,
            ends_at: data.ends_at,
            events
        }

        await QueueService.addAcademicScheduleResponse(schedule)

        return schedule
    } catch (error) {
        LoggerJobContext.add({
            error: 'Extraction error',
            message: (error as Error).message
        })
        return null
    }
}
