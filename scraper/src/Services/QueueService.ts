import scraper from '@scraper/bullmq'
import type { ScraperInSISCourse, ScraperInSISStudyPlan } from '@scraper/types/insis'
import type { ScraperInSISCatalogRequestJob } from '@scraper/types/jobs'
import { runWithConcurrency } from '@scraper/Utils/ConcurrencyUtils'

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

    static async queueCourseRequests(courses: { url: string; courseId: number | null }[]): Promise<void> {
        await scraper.queue.request.addBulk(
            courses.map(({ url, courseId }) => ({
                name: 'InSIS Course Request (Catalog)',
                data: {
                    type: 'InSIS:Course',
                    url
                },
                opts: {
                    deduplication: { id: `InSIS:Course:${courseId}` }
                }
            }))
        )
    }

    static async queueStudyPlanRequests(planUrls: string[], extractIdFn: (url: string) => number | null, concurrency = 20): Promise<void> {
        await runWithConcurrency(planUrls, concurrency, planUrl =>
            scraper.queue.request.add(
                'InSIS Study Plan Request (Study Plans)',
                {
                    type: 'InSIS:StudyPlan',
                    url: planUrl
                },
                { deduplication: { id: `InSIS:StudyPlan:${extractIdFn(planUrl)}` } }
            )
        )
    }

    static async enqueueCatalogRequest(data: ScraperInSISCatalogRequestJob): Promise<void> {
        await scraper.queue.request.add('InSIS Catalog Request (Supervisor)', data, {
            deduplication: { id: 'InSIS:Catalog:Supervisor', ttl: 30_000 }
        })
    }
}
