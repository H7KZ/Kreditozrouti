import type { ScraperInSISAcademicSchedules } from '@scraper/types/insis'
import type { ScraperInSISAcademicSchedulesRequestJob } from '@scraper/types/jobs'
import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { InSISRateLimitError } from '@scraper/Errors/InSISErrors'
import ExtractInSISAcademicScheduleService from '@scraper/Services/ExtractInSISAcademicScheduleService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'
import { runWithConcurrency } from '@scraper/Utils/ConcurrencyUtils'

const FACULTY_CONCURRENCY = 4

export default async function ScraperRequestInSISAcademicSchedulesJob(
    _data: ScraperInSISAcademicSchedulesRequestJob
): Promise<ScraperInSISAcademicSchedules | null> {
    const client = createInSISClient('harmonogram')

    const initialResult = await client.get<string>(Config.insis.harmonogramUrl)

    if (!initialResult.success) {
        if (initialResult.status === 429) throw new InSISRateLimitError(initialResult.retryAfter ?? 60)
        LoggerJobContext.add({ error: 'Failed to fetch harmonogram index', http_status: initialResult.status })
        return null
    }

    try {
        const faculties = ExtractInSISAcademicScheduleService.extractFaculties(initialResult.data)

        LoggerJobContext.add({ faculties_count: faculties.length })

        const allPeriods = (
            await runWithConcurrency(faculties, FACULTY_CONCURRENCY, async faculty => {
                const url = `${Config.insis.harmonogramUrl}?fakulta=${faculty.insis_faculty_id}`
                const result = await client.getSilent<string>(url)
                if (!result?.data) {
                    LoggerJobContext.add({ warning: 'Failed to fetch faculty periods', insis_faculty_id: faculty.insis_faculty_id })
                    return []
                }
                return ExtractInSISAcademicScheduleService.extractPeriods(result.data, faculty.insis_faculty_id)
            })
        ).flat()

        LoggerJobContext.add({ periods_count: allPeriods.length })

        const schedules: ScraperInSISAcademicSchedules = {
            faculties_count: faculties.length,
            periods_count: allPeriods.length
        }

        if (allPeriods.length > 0) {
            await QueueService.queueAcademicScheduleRequests(
                allPeriods.map(period => ({
                    insis_faculty_id: period.insis_faculty_id,
                    insis_period_id: period.insis_period_id,
                    faculty_ident: period.faculty_ident,
                    semester: period.semester,
                    year: period.year,
                    level: period.level,
                    starts_at: period.starts_at,
                    ends_at: period.ends_at
                }))
            )
        }

        await QueueService.addAcademicSchedulesResponse(schedules)

        return schedules
    } catch (error) {
        LoggerJobContext.add({
            error: 'Processing error',
            message: (error as Error).message
        })
        return null
    }
}
