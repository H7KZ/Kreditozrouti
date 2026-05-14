import { InSISNetworkError, InSISParseError } from '@scraper/Errors/InSISErrors'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'
import type { ScraperInSISCourse } from '@scraper/types/insis'
import type { ScraperInSISCourseRequestJob } from '@scraper/types/jobs'
import { withCzechLang } from '@scraper/Utils/HTTPUtils'

/**
 * Scrapes a single InSIS course syllabus page.
 * Extracts course metadata, syllabus content, assessments, timetable,
 * and associated study plan references found on the page.
 *
 * Throws InSISNetworkError on HTTP failures (retryable, up to 3 attempts).
 * Throws InSISParseError on extraction failures (UnrecoverableError, not retried).
 */
export default async function ScraperRequestInSISCourseJob(data: ScraperInSISCourseRequestJob): Promise<ScraperInSISCourse> {
    const courseId = ExtractInSISCourseService.extractIdFromUrl(data.url)
    const client = createInSISClient('course')

    LoggerJobContext.add({
        course_id: courseId,
        url: data.url
    })

    const result = await client.get<string>(withCzechLang(data.url))

    if (!result.success) {
        throw new InSISNetworkError(`HTTP request failed for course ${courseId} at ${data.url}`)
    }

    try {
        const course = ExtractInSISCourseService.extract(result.data, data.url)

        if (!course) {
            throw new InSISParseError(`Course extraction returned null for ${courseId}`)
        }

        await QueueService.addCourseResponse(course)

        return course
    } catch (error) {
        if (error instanceof InSISParseError) throw error

        LoggerJobContext.add({
            error: 'Extraction error',
            message: (error as Error).message
        })
        throw new InSISParseError(`Extraction error for course ${courseId}: ${(error as Error).message}`)
    }
}
