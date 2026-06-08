import type {
    ScraperInSISAcademicSchedule,
    ScraperInSISAcademicSchedules,
    ScraperInSISCourse,
    ScraperInSISFacultyTimetable,
    ScraperInSISFacultyTimetables,
    ScraperInSISStudyPlan
} from '@scraper/types/insis'
import type { ScraperInSISAcademicScheduleRequestJob } from '@scraper/types/jobs'
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
            course,
            content_hash: course.content_hash
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

    static async queueCourseRequests(courses: { url: string; courseId: number | null; content_hash?: string | null }[]): Promise<void> {
        await scraper.queue.request.addBulk(
            courses.map(({ url, courseId, content_hash }) => ({
                name: 'InSIS Course Request (Catalog)',
                data: {
                    type: 'InSIS:Course',
                    url,
                    content_hash
                },
                opts: {
                    deduplication: { id: `InSIS:Course:${courseId}` }
                }
            }))
        )
    }

    static async queueStudyPlanRequests(
        planUrls: string[],
        extractIdFn: (url: string) => number | null,
        options?: { auto_queue_courses?: boolean },
        concurrency = 20
    ): Promise<void> {
        await runWithConcurrency(planUrls, concurrency, url =>
            scraper.queue.request.add(
                'InSIS Study Plan Request (Study Plans)',
                {
                    type: 'InSIS:StudyPlan',
                    url,
                    ...(options?.auto_queue_courses && { auto_queue_courses: true })
                },
                {
                    deduplication: { id: `InSIS:StudyPlan:${extractIdFn(url)}` }
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
        await runWithConcurrency(periods, 4, period =>
            scraper.queue.request.add(
                'InSIS Academic Schedule Request',
                {
                    type: 'InSIS:AcademicSchedule',
                    ...period
                },
                {
                    deduplication: {
                        id: `InSIS:AcademicSchedule:${period.faculty_ident}:${period.insis_period_id}`,
                        ttl: 3600000
                    }
                }
            )
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
        await runWithConcurrency(faculties, 4, faculty =>
            scraper.queue.request.add(
                'InSIS Faculty Timetable Request',
                {
                    type: 'InSIS:FacultyTimetable',
                    f_id: faculty.f_id,
                    name: faculty.name
                },
                {
                    deduplication: {
                        id: `InSIS:FacultyTimetable:${faculty.f_id}`,
                        ttl: 3600000
                    }
                }
            )
        )
    }
}
