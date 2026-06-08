import type { InSISSemester } from '@shared/domain/insis'
import { getPeriodsForLastYears } from '@shared/domain/period'
import { scraper } from '@api/bullmq'
import { mysql } from '@api/clients'
import { StudyPlanCourseTable } from '@api/Database/types'
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
		const rows = await mysql.selectFrom(StudyPlanCourseTable._table).select('course_ident').distinct().execute()
		const allowedIdents = rows.map(r => r.course_ident)

		if (allowedIdents.length === 0) {
			throw Errors.internal('No study plan courses in DB — run study plans scrape first before catalog')
		}

		const periods = options?.periods?.length ? options.periods : getPeriodsForLastYears(4)

		// VŠE has a bounded set of study plan courses (~hundreds), safe for a Redis job payload
		await scraper.queue.request.add(
			'InSIS Catalog Request (Manual)',
			{
				type: 'InSIS:Catalog',
				faculties: options?.faculties,
				periods,
				auto_queue_courses: true,
				allowed_idents: allowedIdents
			},
			{
				deduplication: {
					id: 'InSIS:Catalog:ManualRun',
					ttl: 30 * 1000
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
					id: `InSIS:Course:ManualRun:${url}`,
					ttl: 1000 // 1 second
				}
			}
		)
	}

	/**
	 * Enqueues a job to scrape the InSIS study plans catalog.
	 */
	static async enqueueStudyPlansScrape(options?: { faculties?: string[]; periods?: Period[]; auto_queue_courses?: boolean }): Promise<void> {
		const periods = options?.periods?.length ? options.periods : getPeriodsForLastYears(4)

		await scraper.queue.request.add(
			'InSIS Study Plans Request (Manual)',
			{
				type: 'InSIS:StudyPlans',
				faculties: options?.faculties,
				periods,
				auto_queue_study_plans: true,
				...(options?.auto_queue_courses && { auto_queue_courses: true })
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
		const course = await mysql.selectFrom('insis_courses').select(['url', 'content_hash']).where('id', '=', courseId).executeTakeFirst()

		if (!course) throw Errors.notFound('Course not found')

		const job = await scraper.queue.request.add(
			'InSIS Course Request (Manual)',
			{
				type: 'InSIS:Course',
				url: course.url,
				content_hash: course.content_hash ?? null
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
	 * Enqueues a job to scrape InSIS faculty timetable visibility.
	 */
	static async enqueueFacultyTimetablesScrape(): Promise<void> {
		await scraper.queue.request.add(
			'InSIS Faculty Timetables Request (Manual)',
			{
				type: 'InSIS:FacultyTimetables'
			},
			{
				deduplication: {
					id: 'InSIS:FacultyTimetables:ManualRun',
					ttl: 30 * 1000
				}
			}
		)
	}

	/**
	 * Enqueues a job to scrape the InSIS academic schedules (harmonogram).
	 */
	static async enqueueAcademicSchedulesScrape(): Promise<void> {
		await scraper.queue.request.add(
			'InSIS Academic Schedules Request (Manual)',
			{
				type: 'InSIS:AcademicSchedules'
			},
			{
				deduplication: {
					id: 'InSIS:AcademicSchedules:ManualRun',
					ttl: 30 * 1000
				}
			}
		)
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

	/**
	 * Re-enqueues failed jobs of the given types from the request queue's failed set.
	 * Used to recover from bursts of failures (e.g. staging deadlocks) without manually
	 * re-triggering each scrape. Each retried job is removed from the failed set first,
	 * then re-added as a fresh job (BullMQ's `Job.retry()` re-runs in place but our jobs
	 * never throw on failure — see scraper/CLAUDE.md — so failures here mean the job was
	 * explicitly marked failed, e.g. via `moveToFailed`, and a clean re-add is simplest).
	 *
	 * Returns the count of jobs retried per type.
	 */
	static async retryFailedScrapes(types: ('InSIS:Course' | 'InSIS:StudyPlan')[]): Promise<Record<string, number>> {
		const counts: Record<string, number> = {}
		for (const type of types) counts[type] = 0

		const typeSet = new Set<string>(types)

		// Snapshot the whole failed set up front — removing jobs mid-pagination would
		// shift indices and skip entries. The failed set is bounded (removeOnFail keeps
		// at most 24h of jobs), so a single bulk fetch is safe.
		const failed = await scraper.queue.request.getJobs(['failed'], 0, 5000)

		for (const job of failed) {
			const data = job.data

			if (!data || !typeSet.has(data.type)) continue

			if (data.type === 'InSIS:Course') {
				await scraper.queue.request.add(
					'InSIS Course Request (Retry)',
					{ type: 'InSIS:Course', url: data.url, content_hash: data.content_hash ?? null },
					{ deduplication: { id: `InSIS:Course:Retry:${data.url}`, ttl: 1000 } }
				)
			} else if (data.type === 'InSIS:StudyPlan') {
				await scraper.queue.request.add(
					'InSIS Study Plan Request (Retry)',
					{ type: 'InSIS:StudyPlan', url: data.url },
					{ deduplication: { id: `InSIS:StudyPlan:Retry:${data.url}`, ttl: 1000 } }
				)
			}

			await job.remove()
			counts[data.type]++
		}

		return counts
	}
}
