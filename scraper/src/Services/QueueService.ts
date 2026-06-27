import type {
	ScraperInSISAcademicSchedule,
	ScraperInSISAcademicSchedules,
	ScraperInSISCourse,
	ScraperInSISFacultyTimetable,
	ScraperInSISFacultyTimetables,
	ScraperInSISStudyPlan
} from '@shared/queue/insis'
import type { ScraperInSISAcademicScheduleRequestJob } from '@shared/queue/jobs'
import scraper from '@scraper/bullmq'
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
			course_id: course.id,
			course
		})
	}

	static async addCourseNotFound(courseId: number): Promise<void> {
		await scraper.queue.response.add('InSIS Course Response', {
			type: 'InSIS:Course',
			course_id: courseId,
			course: null
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
					deduplication: {
						id: courseId !== null ? `InSIS:Course:${courseId}` : `InSIS:Course:url:${url}`,
						ttl: 5 * 60 * 1000
					}
				}
			}))
		)
	}

	static async queueStudyPlanRequests(planUrls: string[], extractIdFn: (url: string) => number | null, concurrency = 20): Promise<void> {
		await runWithConcurrency(planUrls, concurrency, url =>
			scraper.queue.request.add(
				'InSIS Study Plan Request (Study Plans)',
				{
					type: 'InSIS:StudyPlan',
					url
				},
				{
					deduplication: { id: `InSIS:StudyPlan:${extractIdFn(url)}`, ttl: 60 * 60 * 1000 }
				}
			)
		)
	}

	static async addAcademicSchedulesResponse(schedules: ScraperInSISAcademicSchedules): Promise<void> {
		await scraper.queue.response.add('InSIS Academic Schedules Response', {
			type: 'InSIS:AcademicSchedules',
			schedules
		})
	}

	static async addAcademicScheduleResponse(schedule: ScraperInSISAcademicSchedule): Promise<void> {
		await scraper.queue.response.add('InSIS Academic Schedule Response', {
			type: 'InSIS:AcademicSchedule',
			schedule
		})
	}

	static async queueAcademicScheduleRequests(periods: Omit<ScraperInSISAcademicScheduleRequestJob, 'type'>[]): Promise<void> {
		await scraper.queue.request.addBulk(
			periods.map(period => ({
				name: 'InSIS Academic Schedule Request',
				data: {
					type: 'InSIS:AcademicSchedule' as const,
					...period
				},
				opts: {
					deduplication: {
						id: `InSIS:AcademicSchedule:${period.faculty_ident}:${period.insis_period_id}`,
						ttl: 3600000
					}
				}
			}))
		)
	}

	static async addFacultyTimetablesResponse(data: ScraperInSISFacultyTimetables): Promise<void> {
		await scraper.queue.response.add('InSIS Faculty Timetables Response', {
			type: 'InSIS:FacultyTimetables',
			data
		})
	}

	static async addFacultyTimetableResponse(timetable: ScraperInSISFacultyTimetable): Promise<void> {
		await scraper.queue.response.add('InSIS Faculty Timetable Response', {
			type: 'InSIS:FacultyTimetable',
			timetable
		})
	}

	static async queueFacultyTimetableRequests(faculties: { f_id: number; name: string }[]): Promise<void> {
		await scraper.queue.request.addBulk(
			faculties.map(faculty => ({
				name: 'InSIS Faculty Timetable Request',
				data: {
					type: 'InSIS:FacultyTimetable' as const,
					f_id: faculty.f_id,
					name: faculty.name
				},
				opts: {
					deduplication: {
						id: `InSIS:FacultyTimetable:${faculty.f_id}`,
						ttl: 3600000
					}
				}
			}))
		)
	}
}
