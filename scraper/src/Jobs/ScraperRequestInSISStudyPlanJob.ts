import type { ScraperInSISStudyPlanRequestJob } from '@scraper/types/jobs'
import { redis } from '@scraper/clients'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'

/**
 * Scrapes a single InSIS study plan page.
 * Extracts plan metadata and course categorizations.
 * Optionally queues individual course requests.
 */
export default async function ScraperRequestInSISStudyPlanJob(data: ScraperInSISStudyPlanRequestJob): Promise<void | null> {
    const planId = ExtractInSISStudyPlanService.extractIdFromUrl(data.url)
    const client = createInSISClient('study_plan')

    LoggerJobContext.add({
        plan_id: planId,
        request_url: data.url
    })

    const result = await client.get<string>(data.url)

    if (!result.success) {
        redis.incr('metrics:scraper:silent_failures:study_plan').catch(() => {})
        redis.expire('metrics:scraper:silent_failures:study_plan', 604800).catch(() => {})
        return null
    }

    try {
        const plan = ExtractInSISStudyPlanService.extract(result.data, data.url)

        await QueueService.addStudyPlanResponse(plan)
    } catch (error) {
        LoggerJobContext.add({
            error: 'Extraction error',
            message: (error as Error).message
        })
        redis.incr('metrics:scraper:silent_failures:study_plan').catch(() => {})
        redis.expire('metrics:scraper:silent_failures:study_plan', 604800).catch(() => {})
        return null
    }
}
