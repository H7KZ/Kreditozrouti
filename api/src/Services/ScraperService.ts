import type { InSISSemester } from '@shared/domain/insis'
import { getPeriodsForLastYears, getUpcomingPeriod } from '@shared/domain/period'
import { scraper } from '@api/bullmq'
import { mysql } from '@api/clients'
import { CourseTable, StudyPlanCourseIdentTable } from '@api/Database/types'
import { Errors } from '@api/Errors'
import InSISService from '@api/Services/InSISService'
import ScraperGapSweeperService from '@api/Services/ScraperGapSweeperService'

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
	static async enqueueCatalogScrape(options?: { faculties?: string[]; periods?: Period[]; auto_queue_courses?: boolean }): Promise<void> {
		const rows = await mysql.selectFrom(StudyPlanCourseIdentTable._table).select('course_ident').distinct().execute()
		const allowedIdents = rows.map(r => r.course_ident)

		if (allowedIdents.length === 0) {
			throw Errors.internal('No course idents in DB — run study plans scrape first before catalog')
		}

		const periods = options?.periods?.length ? options.periods : [getUpcomingPeriod()]

		// VŠE has a bounded set of study plan courses (~hundreds), safe for a Redis job payload
		await scraper.queue.request.add(
			'InSIS Catalog Request (Manual)',
			{
				type: 'InSIS:Catalog',
				faculties: options?.faculties,
				periods,
				auto_queue_courses: options?.auto_queue_courses,
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
	static async enqueueStudyPlansScrape(options?: { faculties?: string[]; periods?: Period[] }): Promise<void> {
		const periods = options?.periods?.length ? options.periods : getPeriodsForLastYears(4)

		await scraper.queue.request.add(
			'InSIS Study Plans Request (Manual)',
			{
				type: 'InSIS:StudyPlans',
				faculties: options?.faculties,
				periods,
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
		const course = await mysql.selectFrom(CourseTable._table).select(['url', 'content_hash']).where('id', '=', courseId).executeTakeFirst()

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
	 * Scans for missing course idents and enqueues a catalog scrape with gap-sweep deduplication.
	 * Returns the count of missing idents found.
	 */
	static async sweepMissingCourses(): Promise<{ missing: number }> {
		const missingIdents = await ScraperGapSweeperService.getMissingIdents()

		if (missingIdents.length === 0) return { missing: 0 }

		const upcomingPeriod = InSISService.getUpcomingPeriod()

		await scraper.queue.request.add(
			'InSIS Catalog Request (Gap Sweep)',
			{
				type: 'InSIS:Catalog',
				faculties: undefined,
				periods: [upcomingPeriod],
				allowed_idents: missingIdents,
				auto_queue_courses: true
			},
			{
				deduplication: {
					id: 'InSIS:Catalog:GapSweep',
					ttl: 60 * 60 * 1000
				}
			}
		)

		return { missing: missingIdents.length }
	}

	/**
	 * Re-enqueues failed jobs of the given types from both queues:
	 *
	 * - Request queue failures: removed and re-added as fresh jobs (scraper re-fetches the page).
	 * - Response queue failures: retried in place via `job.retry()` — the data is already valid,
	 *   only the DB write failed (e.g. deadlock), so no re-scrape is needed.
	 *
	 * Returns the count of jobs retried per type.
	 */
	static async retryFailedScrapes(types: ('InSIS:Course' | 'InSIS:StudyPlan')[]): Promise<Record<string, number>> {
		const counts: Record<string, number> = {}
		for (const type of types) counts[type] = 0

		const typeSet = new Set<string>(types)

		// Snapshot both failed sets up front — removing jobs mid-pagination shifts indices.
		const [failedRequests, failedResponses] = await Promise.all([
			scraper.queue.request.getJobs(['failed'], 0, 5000),
			scraper.queue.response.getJobs(['failed'], 0, 5000)
		])

		for (const job of failedRequests) {
			if (!job) continue
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

		for (const job of failedResponses) {
			if (!job) continue
			const data = job.data

			if (!data || !typeSet.has(data.type)) continue

			await job.retry('failed')
			counts[data.type]++
		}

		return counts
	}
}
