import { scraper } from '@scraper/bullmq'
import ScraperInSISStudyPlans from '@scraper/Interfaces/ScraperInSISStudyPlans'
import { ScraperInSISStudyPlansRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import UtilService from '@scraper/Services/UtilService'
import Axios from 'axios'

/**
 * Initiates the scraping process for the InSIS study plans.
 * Uses a dynamic "drill-down" approach to handle variable depths of study plan hierarchies
 * (e.g., Faculty -> Semester -> Level -> Program -> [Obor?] -> [Spec?] -> Plan).
 */
export default async function ScraperRequestInSISStudyPlansJob(data: ScraperInSISStudyPlansRequestJob): Promise<ScraperInSISStudyPlans> {
    const CONCURRENCY_LIMIT = 10
    const MAX_DRILL_DEPTH = 8

    const baseHeaders = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://insis.vse.cz',
        Referer: 'https://insis.vse.cz/katalog/index.pl?jak=rozsirene',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }

    console.log('Starting InSIS Study Plans Scrape...')

    // 1. Get Faculties
    const request = await Axios.get<string>('https://insis.vse.cz/katalog/plany.pl?lang=cz', { headers: baseHeaders })
    let currentLevelURLs = ExtractInSISService.extractStudyPlansFacultyURLs(request.data)
    console.log(`Found ${currentLevelURLs.length} Faculties.`)

    // 2. Dynamic Drill-Down Loop
    // Get Semesters-> Levels -> Programs -> [Obors?] -> [Specs?] -> Plans
    // This loop handles the variable depth. Some faculties go Program -> Plan.
    // Others (OZS, CESP) go Program -> Obor -> Plan, or even deeper.

    const allFinalPlanUrls = new Set<string>()
    let depth = 0

    while (currentLevelURLs.length > 0 && depth < MAX_DRILL_DEPTH) {
        console.log(`[Depth ${depth}] Processing ${currentLevelURLs.length} navigation nodes...`)

        const responses = await UtilService.runWithConcurrency(currentLevelURLs, CONCURRENCY_LIMIT, url => Axios.get<string>(url, { headers: baseHeaders }))

        const nextLevelURLs: string[] = []

        for (const res of responses) {
            if (!res?.data) continue

            // A. Extract Leaf Nodes (Actual Study Plans)
            const plans = ExtractInSISService.extractStudyPlanURLs(res.data)
            plans.forEach(url => allFinalPlanUrls.add(url))

            // B. Extract Branch Nodes (Drill-down links: Programs, Obors, Specs)
            // Note: extractNavigationURLs excludes any link that is already a 'stud_plan'
            const navigations = ExtractInSISService.extractNavigationURLs(res.data)
            navigations.forEach(url => nextLevelURLs.push(url))
        }

        currentLevelURLs = [...new Set(nextLevelURLs)]
        depth++

        console.log(`[Depth ${depth - 1}] Found ${currentLevelURLs.length} new sub-navigation links. Total Plans so far: ${allFinalPlanUrls.size}`)
    }

    const finalPlanList = Array.from(allFinalPlanUrls)
    console.log(`Total Study Plans Found: ${finalPlanList.length}`)

    // 3. Report and Queue
    const plans = { urls: finalPlanList }
    await scraper.queue.response.add('InSIS Study Plans Response', { type: 'InSIS:StudyPlans', plans })

    if (!finalPlanList || finalPlanList.length === 0 || !data.auto_queue_study_plans) {
        return plans
    }

    // Queue individually with deduplication
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

    return plans
}
