import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ScraperInSISStudyPlans from '@scraper/Interfaces/ScraperInSISStudyPlans'
import { ScraperInSISStudyPlansRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import UtilService from '@scraper/Services/UtilService'
import Axios from 'axios'

export default async function ScraperRequestInSISStudyPlansJob(data: ScraperInSISStudyPlansRequestJob): Promise<ScraperInSISStudyPlans | null> {
    const plans: ScraperInSISStudyPlans = { urls: [] }

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

        LoggerJobContext.add({
            current_level_urls_count: currentLevelURLs.length,
            max_drill_depth: MAX_DRILL_DEPTH,
            concurrency_limit: CONCURRENCY_LIMIT
        })

        while (currentLevelURLs.length > 0 && depth < MAX_DRILL_DEPTH) {
            // Fetch level with concurrency
            const responses = await UtilService.runWithConcurrency(currentLevelURLs, CONCURRENCY_LIMIT, async url => {
                try {
                    return await Axios.get<string>(url, { headers: ExtractInSISService.baseRequestHeaders() })
                } catch {
                    // Log and skip failed requests
                }
            })

            const nextLevelURLs: string[] = []

            for (const res of responses) {
                if (!res?.data) continue

                // Capture Leaves (Plans)
                const foundPlans = ExtractInSISService.extractStudyPlanURLs(res.data)
                foundPlans.forEach(url => allFinalPlanUrls.add(url))

                const includesSemesterAlready = res.config.url?.includes('poc_obdobi=') ?? true

                // Capture Branches (Navigation)
                const navigations = ExtractInSISService.extractNavigationURLs(res.data, !includesSemesterAlready)
                navigations.forEach(url => nextLevelURLs.push(url))
            }

            currentLevelURLs = [...new Set(nextLevelURLs)]
            depth++
        }

        plans.urls = Array.from(allFinalPlanUrls)

        LoggerJobContext.add({
            total_plans_found: plans.urls.length,
            drill_depth_reached: depth
        })

        await scraper.queue.response.add('InSIS Study Plans Response', { type: 'InSIS:StudyPlans', plans })

        if (plans.urls.length && data.auto_queue_study_plans) {
            LoggerJobContext.add({
                auto_queue_study_plans: data.auto_queue_study_plans,
                total_plans_to_queue: plans.urls.length
            })

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

        return plans
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            LoggerJobContext.add({
                error_message: error.message,
                error_code: error.code,
                error_status: error.response?.status,
                error_status_text: error.response?.statusText
            })
        } else {
            LoggerJobContext.add({
                error_message: (error as Error).message
            })
        }

        return null
    }
}
