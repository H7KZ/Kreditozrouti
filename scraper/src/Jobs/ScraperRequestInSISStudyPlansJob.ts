import { scraper } from '@scraper/bullmq'
import { ScraperInSISStudyPlansRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import Axios from 'axios'

/**
 * A native helper to process an array of items with limited concurrency.
 * It creates a shared iterator and spawns 'concurrency' number of workers to consume it.
 */
async function runWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length) as R[]
    const iterator = items.entries()

    const workers = Array(Math.min(items.length, concurrency))
        .fill(null)
        .map(async () => {
            for (const [index, item] of iterator) {
                try {
                    results[index] = await task(item)
                } catch (error) {
                    console.error(`Error processing item ${index}:`, error)
                    throw error
                }
            }
        })

    await Promise.all(workers)
    return results
}

/**
 * Initiates the scraping process for the InSIS study plans.
 * Uses a native worker pool to limit concurrent requests to 5.
 */
export default async function ScraperRequestInSISStudyPlansJob(data: ScraperInSISStudyPlansRequestJob): Promise<void> {
    const CONCURRENCY_LIMIT = 10

    const baseHeaders = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://insis.vse.cz',
        Referer: 'https://insis.vse.cz/katalog/index.pl?jak=rozsirene',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
    }

    const request = await Axios.get<string>('https://insis.vse.cz/katalog/plany.pl?lang=cz', { headers: baseHeaders })
    const studyPlansFacultyURLs = ExtractInSISService.extractStudyPlansFacultyURLs(request.data)

    const semesterResponses = await runWithConcurrency(studyPlansFacultyURLs, CONCURRENCY_LIMIT, url => Axios.get<string>(url, { headers: baseHeaders }))
    const studyPlansSemesterURLs = semesterResponses.flatMap(res => ExtractInSISService.extractStudyPlansSemesterURLs(res.data))

    const levelResponses = await runWithConcurrency(studyPlansSemesterURLs, CONCURRENCY_LIMIT, url => Axios.get<string>(url, { headers: baseHeaders }))
    const studyPlansURLs = levelResponses.flatMap(res => ExtractInSISService.extractStudyPlansLevelURLs(res.data))

    const programmeResponses = await runWithConcurrency(studyPlansURLs, CONCURRENCY_LIMIT, url => Axios.get<string>(url, { headers: baseHeaders }))
    const studyPlansProgrammeURLs = programmeResponses.flatMap(res => ExtractInSISService.extractStudyPlansProgrammeURLs(res.data))

    const finalPlanResponses = await runWithConcurrency(studyPlansProgrammeURLs, CONCURRENCY_LIMIT, url => Axios.get<string>(url, { headers: baseHeaders }))
    const studyPlansUrls = finalPlanResponses.flatMap(res => ExtractInSISService.extractStudyPlanURLs(res.data))

    const plans = { urls: studyPlansUrls }
    await scraper.queue.response.add('InSIS Study Plans Response', { type: 'InSIS:StudyPlans', plans })

    if (!plans.urls || plans.urls.length === 0 || !data.auto_queue_study_plans) {
        return
    }

    await runWithConcurrency(plans.urls, 20, planUrl =>
        scraper.queue.request.add('InSIS Study Plan Request (Study Plans)', { type: 'InSIS:StudyPlan', url: planUrl, auto_queue_courses: true })
    )
}
