import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ScraperInSISCourse from '@scraper/Interfaces/ScraperInSISCourse'
import { ScraperInSISCourseRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { InSISQueueService } from '@scraper/Services/InSISQueueService'
import { withCzechLang } from '@scraper/Utils/HTTPUtils'

/**
 * Scrapes a single InSIS course syllabus page.
 * Extracts course metadata, syllabus content, assessments, timetable,
 * and associated study plan references found on the page.
 */
export default async function ScraperRequestInSISCourseJob(data: ScraperInSISCourseRequestJob): Promise<ScraperInSISCourse | null> {
    const courseId = ExtractInSISCourseService.extractIdFromUrl(data.url)
    const client = createInSISClient('course')

    LoggerJobContext.add({
        course_id: courseId,
        url: data.url
    })

    const result = await client.get<string>(withCzechLang(data.url))

    if (!result.success) return null

    try {
        const course = ExtractInSISCourseService.extract(result.data, data.url)

        if (!course) {
            LoggerJobContext.add({ error: 'Course extraction returned null' })
            return null
        }

        await InSISQueueService.addCourseResponse(course)

        return course
    } catch (error) {
        LoggerJobContext.add({
            error: 'Extraction error',
            message: (error as Error).message
        })
        return null
    }
}
