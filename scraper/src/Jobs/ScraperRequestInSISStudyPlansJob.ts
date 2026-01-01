import scraper from '@scraper/bullmq'
import ScraperInSISStudyPlans from '@scraper/Interfaces/ScraperInSISStudyPlans'
import { ScraperInSISStudyPlansRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import LoggerService from '@scraper/Services/LoggerService'
import UtilService from '@scraper/Services/UtilService'
import Axios from 'axios'

export default async function ScraperRequestInSISStudyPlansJob(data: ScraperInSISStudyPlansRequestJob): Promise<ScraperInSISStudyPlans | null> {
    const logger = new LoggerService(`[InSIS:StudyPlansList]`)
    const plans: ScraperInSISStudyPlans = { urls: [] }

    logger.log('Started - Fetching base faculties...')

    try {
        // Initial Fetch
        const response = await Axios.get<string>('https://insis.vse.cz/katalog/plany.pl?lang=cz', {
            headers: ExtractInSISService.baseRequestHeaders()
        })
        let currentLevelURLs = ExtractInSISService.extractStudyPlansFacultyURLs(response.data)

        const allFinalPlanUrls = new Set<string>()
        let depth = 0
        const MAX_DRILL_DEPTH = 8
        const CONCURRENCY_LIMIT = 10

        logger.log(`Found ${currentLevelURLs.length} roots. Starting BFS drill-down (Max Depth: ${MAX_DRILL_DEPTH})...`)

        while (currentLevelURLs.length > 0 && depth < MAX_DRILL_DEPTH) {
            logger.log(`Depth ${depth}: Processing ${currentLevelURLs.length} nodes...`)

            // Fetch level with concurrency
            const responses = await UtilService.runWithConcurrency(currentLevelURLs, CONCURRENCY_LIMIT, async url => {
                try {
                    return await Axios.get<string>(url, { headers: ExtractInSISService.baseRequestHeaders() })
                } catch {
                    logger.warn(`Failed to fetch node: ${url}`)
                }
            })

            const nextLevelURLs: string[] = []

            for (const res of responses) {
                if (!res?.data) continue

                // Capture Leaves (Plans)
                const foundPlans = ExtractInSISService.extractStudyPlanURLs(res.data)
                foundPlans.forEach(url => allFinalPlanUrls.add(url))

                // Capture Branches (Navigation)
                const navigations = ExtractInSISService.extractNavigationURLs(res.data)
                navigations.forEach(url => nextLevelURLs.push(url))
            }

            currentLevelURLs = [...new Set(nextLevelURLs)]
            depth++
        }

        plans.urls = Array.from(allFinalPlanUrls)
        logger.log(`Drill-Down Complete - Found ${plans.urls.length} study plans. Queuing response...`)

        await scraper.queue.response.add('InSIS Study Plans Response', { type: 'InSIS:StudyPlans', plans })

        if (plans.urls.length && data.auto_queue_study_plans) {
            logger.log(`Auto-Queueing ${plans.urls.length} individual plan jobs...`)
            await UtilService.runWithConcurrency(plans.urls, 20, planUrl =>
                scraper.queue.request.add(
                    'InSIS Study Plan Request (Study Plans)',
                    {
                        type: 'InSIS:StudyPlan',
                        url: planUrl,
                        auto_queue_courses: data.auto_queue_courses
                    },
                    { deduplication: { id: `InSIS:StudyPlan:${ExtractInSISService.extractStudyPlanIdFromURL(planUrl)}` } }
                )
            )
        }

        logger.log('Finished successfully.')
        return plans
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            logger.error(`Network Error: ${error.message}`)
        } else {
            logger.error(`Processing Error: ${(error as Error).message}`)
        }

        return null
    }
}
