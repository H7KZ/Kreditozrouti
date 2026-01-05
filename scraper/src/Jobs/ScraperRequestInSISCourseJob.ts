import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ScraperInSISCourse from '@scraper/Interfaces/ScraperInSISCourse'
import { ScraperInSISCourseRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import Axios from 'axios'

export default async function ScraperRequestInSISCourseJob(data: ScraperInSISCourseRequestJob): Promise<ScraperInSISCourse | null> {
    const courseId = ExtractInSISService.extractCourseIdFromURL(data.url)

    LoggerJobContext.add({
        course_id: courseId,
        faculty: data.meta.faculty.name,
        url: data.url
    })

    try {
        const response = await Axios.get<string>(`${data.url};lang=cz`, {
            headers: ExtractInSISService.baseRequestHeaders()
        })

        const course = ExtractInSISService.extractCourse(response.data, data.url, data.meta.faculty.name)

        if (!course) {
            LoggerJobContext.add({
                error: 'Course extraction returned null'
            })

            return null
        }

        await scraper.queue.response.add('InSIS Course Response', { type: 'InSIS:Course', course })

        return course
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            LoggerJobContext.add({
                error: 'Axios Error',
                course_status: error.response?.status,
                statusText: error.response?.statusText,
                url: data.url
            })
        } else {
            LoggerJobContext.add({
                error: 'Unknown Error',
                message: (error as Error).message,
                url: data.url
            })
        }

        return null
    }
}
