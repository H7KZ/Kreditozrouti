import type { ScraperInSISCourse, ScraperInSISStudyPlan } from '@scraper/types/insis'
import type { ScrapingMode } from '@scraper/types/jobs'
import scraper from '@scraper/bullmq'
import { runWithConcurrency } from '@scraper/Utils/ConcurrencyUtils'
import { leafDelayForMode } from '@scraper/Utils/ThrottleUtils'

/**
 * Centralized queue operations for InSIS scraper jobs.
 * Provides type-safe wrappers around BullMQ operations.
 */
export class QueueService {
    static async addCatalogResponse(urls: string[]): Promise<void> {
        await scraper.queue.response.add(`InSIS Catalog Response`, {
            type: 'InSIS:Catalog',
            catalog: { urls }
        })
    }

    static async addCourseResponse(course: ScraperInSISCourse): Promise<void> {
        await scraper.queue.response.add('InSIS Course Response', {
            type: 'InSIS:Course',
            course
        })
    }

    static async addStudyPlanResponse(plan: ScraperInSISStudyPlan): Promise<void> {
        await scraper.queue.response.add('InSIS Study Plan Response', {
            type: 'InSIS:StudyPlan',
            plan
        })
    }

    static async addStudyPlansResponse(plans: { urls: string[] }): Promise<void> {
        await scraper.queue.response.add('InSIS Study Plans Response', {
            type: 'InSIS:StudyPlans',
            plans
        })
    }

    static async queueCourseRequests(courses: { url: string; courseId: number | null }[], mode: ScrapingMode): Promise<void> {
        const delay = leafDelayForMode(mode)
        await scraper.queue.request.addBulk(
            courses.map(({ url, courseId }, index) => ({
                name: 'InSIS Course Request (Catalog)',
                data: {
                    type: 'InSIS:Course',
                    url
                },
                opts: {
                    deduplication: { id: `InSIS:Course:${courseId}` },
                    ...(delay > 0 && { delay: index * delay })
                }
            }))
        )
    }

    static async queueStudyPlanRequests(planUrls: string[], extractIdFn: (url: string) => number | null, mode: ScrapingMode, concurrency = 20): Promise<void> {
        const delay = leafDelayForMode(mode)
        const indexed = planUrls.map((url, index) => ({ url, index }))
        await runWithConcurrency(indexed, concurrency, ({ url, index }) =>
            scraper.queue.request.add(
                'InSIS Study Plan Request (Study Plans)',
                {
                    type: 'InSIS:StudyPlan',
                    url
                },
                {
                    deduplication: { id: `InSIS:StudyPlan:${extractIdFn(url)}` },
                    ...(delay > 0 && { delay: index * delay })
                }
            )
        )
    }
}
