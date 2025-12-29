import { scraper } from '@scraper/bullmq'
import ScraperInSISStudyPlans from '@scraper/Interfaces/ScraperInSISStudyPlans'
import { ScraperInSISStudyPlansRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import LoggerService from '@scraper/Services/LoggerService'
import UtilService from '@scraper/Services/UtilService'
import Axios from 'axios'

export default async function ScraperRequestInSISStudyPlansJob(data: ScraperInSISStudyPlansRequestJob): Promise<ScraperInSISStudyPlans> {
    const logger = new LoggerService(`[${data.type}]`)

    logger.log('Started - Fetching base faculties...')

    const CONCURRENCY_LIMIT = 10
    const MAX_DRILL_DEPTH = 8

    const response = await Axios.get<string>('https://insis.vse.cz/katalog/plany.pl?lang=cz', { headers: ExtractInSISService.baseRequestHeaders() })

    let currentLevelURLs = ExtractInSISService.extractStudyPlansFacultyURLs(response.data)

    const allFinalPlanUrls = new Set<string>()
    let depth = 0

    logger.log(`Initial extraction - Found ${currentLevelURLs.length} roots. Starting Drill-Down...`)

    while (currentLevelURLs.length > 0 && depth < MAX_DRILL_DEPTH) {
        logger.log(`Drill-Down Depth ${depth}: Processing ${currentLevelURLs.length} URLs...`)

        const responses = await UtilService.runWithConcurrency(currentLevelURLs, CONCURRENCY_LIMIT, url =>
            Axios.get<string>(url, { headers: ExtractInSISService.baseRequestHeaders() })
        )

        const nextLevelURLs: string[] = []

        for (const res of responses) {
            if (!res?.data) continue

            const plans = ExtractInSISService.extractStudyPlanURLs(res.data)
            plans.forEach(url => allFinalPlanUrls.add(url))

            const navigations = ExtractInSISService.extractNavigationURLs(res.data)
            navigations.forEach(url => nextLevelURLs.push(url))
        }

        currentLevelURLs = [...new Set(nextLevelURLs)]
        depth++
    }

    const finalPlanList = Array.from(allFinalPlanUrls)
    logger.log(`Drill-Down Complete. Found ${finalPlanList.length} total study plans. Queuing response...`)

    const plans = { urls: finalPlanList }
    await scraper.queue.response.add('InSIS Study Plans Response', { type: 'InSIS:StudyPlans', plans })

    if (!finalPlanList || finalPlanList.length === 0 || !data.auto_queue_study_plans) {
        logger.log('Finished (No individual jobs queued).')
        return plans
    }

    logger.log(`Auto-Queueing ${finalPlanList.length} individual study plan jobs...`)
    await UtilService.runWithConcurrency(finalPlanList, 20, planUrl =>
        scraper.queue.request.add(
            'InSIS Study Plan Request (Study Plans)',
            {
                type: 'InSIS:StudyPlan',
                url: planUrl,
                auto_queue_courses: data.auto_queue_courses
            },
            {
                deduplication: {
                    id: `InSIS:StudyPlan:${ExtractInSISService.extractStudyPlanIdFromURL(planUrl)}`
                }
            }
        )
    )

    logger.log('Finished successfully.')
    return plans
}
