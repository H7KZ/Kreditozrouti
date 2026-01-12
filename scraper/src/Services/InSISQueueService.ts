import scraper from '@scraper/bullmq'
import ScraperInSISCourse from '@scraper/Interfaces/ScraperInSISCourse'
import ScraperInSISStudyPlan from '@scraper/Interfaces/ScraperInSISStudyPlan'
import { runWithConcurrency } from '@scraper/Utils/ConcurrencyUtils'

/**
 * Centralized queue operations for InSIS scraper jobs.
 * Provides type-safe wrappers around BullMQ operations.
 */
export class InSISQueueService {
    static async addCatalogResponse(faculty: { id: number; name: string }, period: { id: number; name: string }, urls: string[]): Promise<void> {
        await scraper.queue.response.add(`InSIS Catalog Response ${faculty.name} ${period.name}`, {
            type: 'InSIS:Catalog',
            catalog: { urls },
            meta: { faculty, period }
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

    static async queueCourseRequests(
        courses: { url: string; courseId: number | null }[],
        meta: {
            faculty: { id: number | null; name: string | null }
            period: { id: number | null; name: string | null }
        }
    ): Promise<void> {
        await scraper.queue.request.addBulk(
            courses.map(({ url, courseId }) => ({
                name: 'InSIS Course Request (Catalog)',
                data: {
                    type: 'InSIS:Course',
                    url,
                    meta
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
}
