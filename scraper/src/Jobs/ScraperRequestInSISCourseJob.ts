import scraper from '@scraper/bullmq'
import ScraperInSISCourse from '@scraper/Interfaces/ScraperInSISCourse'
import { ScraperInSISCourseRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequestInSISCourseJob(data: ScraperInSISCourseRequestJob): Promise<ScraperInSISCourse | null> {
    const courseId = ExtractInSISService.extractCourseIdFromURL(data.url)
    const logger = new LoggerService(`[InSIS:Course] [ID: ${courseId}]`)

    logger.log('Started - Fetching HTML...')

    try {
        const response = await Axios.get<string>(`${data.url};lang=cz`, {
            headers: ExtractInSISService.baseRequestHeaders()
        })

        logger.log('HTML Fetched - Extracting course data...')
        const course = ExtractInSISService.extractCourse(response.data, data.url, data.meta.faculty.name)

        if (!course) {
            logger.warn('Extraction returned null.')
            return null
        }

        logger.log('Extraction Complete - Queuing response...')
        await scraper.queue.response.add('InSIS Course Response', { type: 'InSIS:Course', course })

        logger.log('Finished successfully.')
        return course
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            logger.error(`Network Error: ${error.message} (Status: ${error.response?.status})`)
        } else {
            logger.error(`Processing Error: ${(error as Error).message}`)
        }

        return null
    }
}
