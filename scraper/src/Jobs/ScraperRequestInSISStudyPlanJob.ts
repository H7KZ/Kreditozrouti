import { scraper } from '@scraper/bullmq'
import { ScraperInSISStudyPlanRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import LoggerService from '@scraper/Services/LoggerService'
import UtilService from '@scraper/Services/UtilService'
import Axios from 'axios'

export default async function ScraperRequestInSISStudyPlanJob(data: ScraperInSISStudyPlanRequestJob): Promise<void> {
    const planId = ExtractInSISService.extractStudyPlanIdFromURL(data.url)

    const logger = new LoggerService(`[${data.type}] [${planId}]`)

    logger.log('Started - Fetching HTML...')

    const response = await Axios.get<string>(data.url, {
        headers: ExtractInSISService.baseRequestHeaders()
    })

    logger.log('HTML Fetched - Extracting plan structure...')
    const plan = ExtractInSISService.extractStudyPlan(response.data, data.url)

    if (plan.courses && plan.courses.length > 0 && data.auto_queue_courses) {
        logger.log(`Found ${plan.courses.length} courses inside plan. Queueing concurrent course requests...`)

        await UtilService.runWithConcurrency(plan.courses, 20, async course => {
            if (!course.url) return

            await scraper.queue.request.add(
                'InSIS Course Request (Study Plan)',
                {
                    type: 'InSIS:Course',
                    url: course.url,
                    meta: {
                        faculty: { id: null, name: plan.faculty ? plan.faculty.toLowerCase() : null },
                        period: { id: null, name: plan.semester ? plan.semester.toUpperCase() : null }
                    }
                },
                {
                    deduplication: { id: `InSIS:Course:${ExtractInSISService.extractCourseIdFromURL(course.url)}` }
                }
            )
        })
    }

    logger.log('Queuing Plan Response...')
    await scraper.queue.response.add('InSIS Study Plan Response', { type: 'InSIS:StudyPlan', plan })

    logger.log('Finished successfully.')
}
