import type { ScraperInSISStudyPlans } from '@scraper/types/insis'
import type { ScraperInSISStudyPlansRequestJob } from '@scraper/types/jobs'
import { redis } from '@scraper/clients'
import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ExtractInSISStudyPlanService from '@scraper/Services/ExtractInSISStudyPlanService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'
import { runWithConcurrency } from '@scraper/Utils/ConcurrencyUtils'
import { extractSemester, extractYear } from '@scraper/Utils/InSISUtils'
import { bfsConcurrencyForMode } from '@scraper/Utils/ThrottleUtils'

const MaxDrillDepth = 8

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
        redis.incr('metrics:scraper:silent_failures:study_plans').catch(() => {
            /* empty */
        })
        redis.expire('metrics:scraper:silent_failures:study_plans', 604800).catch(() => {
            /* empty */
        })
        return null
    }

    let faculties = ExtractInSISStudyPlanService.extractFaculties(initialResult.data)

    const concurrency = bfsConcurrencyForMode(data.mode)

    LoggerJobContext.add({
        faculty_urls_count: faculties.length,
        max_drill_depth: MaxDrillDepth,
        concurrency_limit: concurrency,
        mode: data.mode
    })

    if (data.faculties && data.faculties.length > 0) {
        faculties = faculties.filter(f => data.faculties!.map(df => df.toLowerCase()).includes(f.title.toLowerCase()))
    }

    // Traverse hierarchy to collect all plan URLs
    const planUrls = await traverseHierarchy(
        client,
        faculties.map(f => f.url),
        data.periods,
        concurrency
    )

    const plans: ScraperInSISStudyPlans = { urls: planUrls }

    LoggerJobContext.add({
        total_plans_found: plans.urls.length
    })

    await QueueService.addStudyPlansResponse(plans)

    // Queue individual plan requests if enabled
    if (plans.urls.length && data.auto_queue_study_plans) {
        LoggerJobContext.add({
            auto_queue_study_plans: true,
            total_plans_to_queue: plans.urls.length
        })

        await QueueService.queueStudyPlanRequests(plans.urls, url => ExtractInSISStudyPlanService.extractIdFromUrl(url), data.mode)
    }

    return plans
}

/**
 * Breadth-first traversal of the study plan hierarchy.
 * Returns all discovered final plan URLs.
 */
async function traverseHierarchy(
    client: ReturnType<typeof createInSISClient>,
    initialUrls: string[],
    periods: ScraperInSISStudyPlansRequestJob['periods'],
    concurrency: number
): Promise<string[]> {
    const allPlanUrls = new Set<string>()
    let currentLevelUrls = initialUrls
    let depth = 0

    while (currentLevelUrls.length > 0 && depth < MaxDrillDepth) {
        const responses = await runWithConcurrency(currentLevelUrls, concurrency, url => client.getSilent<string>(url))

        const nextLevelUrls = new Set<string>()

        for (const response of responses) {
            if (!response?.data) continue

            // Collect final plan URLs (leaves)
            const planUrls = ExtractInSISStudyPlanService.extractPlanUrls(response.data)
            for (const url of planUrls) allPlanUrls.add(url)

            // Collect navigation URLs (branches)
            const hasPeriod = response.config.url?.includes('poc_obdobi=') ?? true
            const navigations = ExtractInSISStudyPlanService.extractNavigationUrls(response.data)

            if (periods && periods.length > 0 && !hasPeriod) {
                // Filter navigation URLs by specified periods
                for (const nav of navigations) {
                    for (const period of periods) {
                        const semester = nav.texts.map(t => extractSemester(t)).find(s => s !== null)
                        const year = nav.texts.map(t => extractYear(t)).find(s => s !== null)

                        if (semester === period.semester && year === period.year) {
                            nextLevelUrls.add(nav.url)
                            break
                        }
                    }
                }
            } else {
                // No period filtering needed, add all navigation URLs
                for (const nav of navigations) nextLevelUrls.add(nav.url)
            }
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
