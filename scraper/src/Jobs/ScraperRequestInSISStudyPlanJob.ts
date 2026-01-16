import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { ScraperInSISStudyPlanRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { InSISQueueService } from '@scraper/Services/InSISQueueService'

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

    if (!result.success) return null

    try {
        const plan = ExtractInSISStudyPlanService.extract(result.data, data.url)

        await InSISQueueService.addStudyPlanResponse(plan)
    } catch (error) {
        LoggerJobContext.add({
            error: 'Extraction error',
            message: (error as Error).message
        })
        return null
    }
}
