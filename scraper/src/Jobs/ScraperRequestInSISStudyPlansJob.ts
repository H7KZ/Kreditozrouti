import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ScraperInSISStudyPlans from '@scraper/Interfaces/ScraperInSISStudyPlans'
import { ScraperInSISStudyPlansRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { InSISQueueService } from '@scraper/Services/InSISQueueService'
import { runWithConcurrency } from '@scraper/Utils/ConcurrencyUtils'

const MaxDrillDepth = 8
const ConcurrencyLimit = 10

/**
 * Scrapes the InSIS study plans hierarchy.
 *
 * Performs breadth-first traversal of the faculty → program → specialization hierarchy,
 * collecting all study plan URLs. Optionally queues individual plan requests.
 */
export default async function ScraperRequestInSISStudyPlansJob(data: ScraperInSISStudyPlansRequestJob): Promise<ScraperInSISStudyPlans | null> {
    const client = createInSISClient('study_plans')

    // Fetch initial faculty list
    const initialResult = await client.get<string>(Config.insis.studyPlansUrl)

    if (!initialResult.success) {
        return null
    }

    const facultyUrls = ExtractInSISStudyPlanService.extractFacultyUrls(initialResult.data)

    LoggerJobContext.add({
        faculty_urls_count: facultyUrls.length,
        max_drill_depth: MaxDrillDepth,
        concurrency_limit: ConcurrencyLimit
    })

    // Traverse hierarchy to collect all plan URLs
    const planUrls = await traverseHierarchy(client, facultyUrls)

    const plans: ScraperInSISStudyPlans = { urls: planUrls }

    LoggerJobContext.add({
        total_plans_found: plans.urls.length
    })

    await InSISQueueService.addStudyPlansResponse(plans)

    // Queue individual plan requests if enabled
    if (plans.urls.length && data.auto_queue_study_plans) {
        LoggerJobContext.add({
            auto_queue_study_plans: true,
            total_plans_to_queue: plans.urls.length
        })

        await InSISQueueService.queueStudyPlanRequests(plans.urls, url => ExtractInSISStudyPlanService.extractIdFromUrl(url))
    }

    return plans
}

/**
 * Breadth-first traversal of the study plan hierarchy.
 * Returns all discovered final plan URLs.
 */
async function traverseHierarchy(client: ReturnType<typeof createInSISClient>, initialUrls: string[]): Promise<string[]> {
    const allPlanUrls = new Set<string>()
    let currentLevelUrls = initialUrls
    let depth = 0

    while (currentLevelUrls.length > 0 && depth < MaxDrillDepth) {
        const responses = await runWithConcurrency(currentLevelUrls, ConcurrencyLimit, url => client.getSilent<string>(url))

        const nextLevelUrls = new Set<string>()

        for (const response of responses) {
            if (!response?.data) continue

            // Collect final plan URLs (leaves)
            const planUrls = ExtractInSISStudyPlanService.extractPlanUrls(response.data)
            planUrls.forEach(url => allPlanUrls.add(url))

            // Collect navigation URLs (branches)
            const hasSemesterParam = response.config.url?.includes('poc_obdobi=') ?? true
            const navUrls = ExtractInSISStudyPlanService.extractNavigationUrls(response.data, !hasSemesterParam)
            navUrls.forEach(url => nextLevelUrls.add(url))
        }

        currentLevelUrls = [...nextLevelUrls]
        depth++

        LoggerJobContext.add({
            [`depth_${depth}_urls`]: currentLevelUrls.length,
            [`depth_${depth}_plans`]: allPlanUrls.size
        })
    }

    return [...allPlanUrls]
}
