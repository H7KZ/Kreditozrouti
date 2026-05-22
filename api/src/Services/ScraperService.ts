import type { InSISSemester } from '@shared/domain/insis'
import { scraper } from '@api/bullmq'
import { mysql } from '@api/clients'
import { Errors } from '@api/Errors'

interface Period {
	semester: InSISSemester | null
	year: number
}

/**
 * Encapsulates all BullMQ job-enqueueing logic for InSIS scraping operations.
 */
export default class ScraperService {
	/**
	 * Enqueues a job to scrape the InSIS course catalog.
	 */
	static async enqueueCatalogScrape(options?: { faculties?: string[]; periods?: Period[] }): Promise<void> {
		await scraper.queue.request.add(
			'InSIS Catalog Request (Manual)',
			{
				type: 'InSIS:Catalog',
				faculties: options?.faculties,
				periods: options?.periods,
				auto_queue_courses: true
			},
			{
				deduplication: {
					id: 'InSIS:Catalog:ManualRun',
					ttl: 30 * 1000 // 30 seconds
				}
			}
		)
	}

	/**
	 * Enqueues a job to scrape a specific InSIS course page.
	 */
	static async enqueueCourseScrape(url: string): Promise<void> {
		await scraper.queue.request.add(
			'InSIS Course Request (Manual)',
			{
				type: 'InSIS:Course',
				url
			},
			{
				deduplication: {
					id: 'InSIS:Course:ManualRun',
					ttl: 1000 // 1 second
				}
			}
		)
	}

	/**
	 * Enqueues a job to scrape the InSIS study plans catalog.
	 */
	static async enqueueStudyPlansScrape(options?: { faculties?: string[]; periods?: Period[] }): Promise<void> {
		await scraper.queue.request.add(
			'InSIS Study Plans Request (Manual)',
			{
				type: 'InSIS:StudyPlans',
				faculties: options?.faculties,
				periods: options?.periods,
				auto_queue_study_plans: true
			},
			{
				deduplication: {
					id: 'InSIS:StudyPlans:ManualRun',
					ttl: 30 * 1000 // 30 seconds
				}
			}
		)
	}

	/**
	 * Looks up a course by numeric ID, then enqueues a scrape job for it.
	 * Returns the job ID string.
	 */
	static async enqueueCourseScrapeById(courseId: number): Promise<string> {
		const course = await mysql.selectFrom('insis_courses').select('url').where('id', '=', courseId).executeTakeFirst()

		if (!course) throw Errors.notFound('Course not found')

		const job = await scraper.queue.request.add(
			'InSIS Course Request (Manual)',
			{
				type: 'InSIS:Course',
				url: course.url
			},
			{
				deduplication: {
					id: `InSIS:Course:ManualRun:${courseId}`,
					ttl: 1000
				}
			}
		)

		return job.id ?? String(courseId)
	}

	/**
	 * Enqueues a job to scrape a specific InSIS study plan page.
	 */
	static async enqueueStudyPlanScrape(url: string): Promise<void> {
		await scraper.queue.request.add(
			'InSIS Study Plan Request (Manual)',
			{
				type: 'InSIS:StudyPlan',
				url
			},
			{
				deduplication: {
					id: 'InSIS:StudyPlan:ManualRun',
					ttl: 1000 // 1 second
				}
			}
		)
	}
}
