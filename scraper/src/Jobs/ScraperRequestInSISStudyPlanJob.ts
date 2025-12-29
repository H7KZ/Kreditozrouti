import { scraper } from '@scraper/bullmq'
import { ScraperInSISStudyPlanRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import UtilService from '@scraper/Services/UtilService'
import Axios from 'axios'

/**
 * Scrapes detailed information for a specific InSIS study plan.
 * Fetches the course page HTML, extracts metadata, and queues the result for persistence.
 *
 * @param data - The job payload containing the target study plan URL.
 * @returns A promise that resolves when the parsed study plan data has been queued.
 */
export default async function ScraperRequestInSISStudyPlanJob(data: ScraperInSISStudyPlanRequestJob): Promise<void> {
    const request = await Axios.get<string>(data.url, {
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: 'https://insis.vse.cz/katalog/index.pl',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
    })

    const plan = ExtractInSISService.extractStudyPlan(request.data, data.url)

    if (plan.courses && plan.courses.length > 0 && data.auto_queue_courses) {
        await UtilService.runWithConcurrency(plan.courses, 20, async course => {
            if (!course.url) {
                return
            }

            await scraper.queue.request.add(
                'InSIS Course Request (Study Plan)',
                {
                    type: 'InSIS:Course',
                    url: course.url,
                    meta: {
                        faculty: {
                            id: null,
                            name: plan.faculty ? plan.faculty.toLowerCase() : null
                        },
                        period: {
                            id: null,
                            name: plan.semester ? plan.semester.toUpperCase() : null
                        }
                    }
                },
                {
                    deduplication: {
                        id: `InSIS:Course:${ExtractInSISService.extractCourseIdFromURL(course.url)}`
                    }
                }
            )
        })
    }

    await scraper.queue.response.add('InSIS Study Plan Response', { type: 'InSIS:StudyPlan', plan })
}
