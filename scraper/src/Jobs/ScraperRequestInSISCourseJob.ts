import { scraper } from '@scraper/bullmq'
import ScraperInSISCourse from '@scraper/Interfaces/ScraperInSISCourse'
import { ScraperInSISCourseRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequestInSISCourseJob(data: ScraperInSISCourseRequestJob): Promise<ScraperInSISCourse> {
    const courseId = ExtractInSISService.extractCourseIdFromURL(data.url)

    const logger = new LoggerService(`[${data.type}] [${courseId}]`)

    logger.log('Started - Fetching HTML...')

    const response = await Axios.get<string>(`${data.url};lang=cz`, {
        headers: ExtractInSISService.baseRequestHeaders()
    })

    logger.log('HTML Fetched - Extracting data...')
    const course = ExtractInSISService.extractCourse(response.data, data.url, data.meta.faculty.name)

    logger.log('Extraction Complete - Queuing response...')
    await scraper.queue.response.add('InSIS Course Response', { type: 'InSIS:Course', course })

    logger.log('Finished successfully.')
    return course
}
