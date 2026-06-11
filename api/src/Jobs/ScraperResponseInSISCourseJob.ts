import type {
	ScraperInSISCourseAssessmentMethod,
	ScraperInSISCourseTimetableSlot,
	ScraperInSISCourseTimetableUnit
} from '@shared/queue/insis'
import type { ScraperInSISCourseResponseJob } from '@shared/queue/jobs'
import { Transaction } from 'kysely'
import { timeToMinutes } from '@shared/domain/time'
import { mysql, redis } from '@api/clients'
import LoggerJobContext from '@api/Context/LoggerJobContext'
import {
	CourseAssessmentTable,
	CourseTable,
	CourseUnitSlotTable,
	CourseUnitTable,
	Database,
	NewCourse,
	NewCourseUnit,
	NewCourseUnitSlot,
	StudyPlanCourseIdentTable,
	StudyPlanCourseTable
} from '@api/Database/types'
import { insertFacultiesBatch } from '@api/Jobs/helpers'

/**
 * Syncs a scraped InSIS course into the database.
 */
export default async function ScraperResponseInSISCourseJob(data: ScraperInSISCourseResponseJob): Promise<void> {
	const { course } = data

	LoggerJobContext.add({
		course_id: course?.id,
		course_ident: course?.ident
	})

	if (!course?.id) {
		LoggerJobContext.add({ skipped_no_id: true })
		return
	}

	const facultyId = course.faculty?.ident ?? null

	await insertFacultiesBatch(mysql, [course.faculty?.ident, ...(course.study_plans?.map(p => p.facultyIdent) ?? [])])

	// Skip the rest if course hasn't changed since last scrape.
	// Normalize to string in case mysql2 returns a Date object for the date column.
	if (course.last_modified_date) {
		const existing = await mysql.selectFrom(CourseTable._table).select('last_modified_date').where('id', '=', course.id).executeTakeFirst()

		// mysql2 may return Date objects for date-typed columns at runtime despite the string TS type
		const raw = existing?.last_modified_date as unknown
		const dbDate = raw instanceof Date ? raw.toISOString().slice(0, 10) : (raw as string | null | undefined)

		if (dbDate === course.last_modified_date) {
			LoggerJobContext.add({ skipped_unchanged: true })
			await mysql
				.updateTable(CourseTable._table)
				.set({ last_scraped_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
				.where('id', '=', course.id)
				.execute()
			return
		}
	}

	await mysql.transaction().execute(async trx => {
		const coursePayload: NewCourse = {
			id: course.id,
			url: course.url,
			ident: course.ident ?? '',
			title: course.title,
			title_cs: course.title_cs,
			title_en: course.title_en,
			ects: course.ects,
			faculty_id: facultyId,
			mode_of_delivery: course.mode_of_delivery,
			mode_of_completion: course.mode_of_completion,
			languages: course.languages?.join('|') ?? null,
			level: course.level,
			year_of_study: course.year_of_study,
			semester: course.semester,
			year: course.year,
			lecturers: course.lecturers?.join('|') ?? null,
			prerequisites: course.prerequisites,
			recommended_programmes: course.recommended_programmes,
			required_work_experience: course.required_work_experience,
			aims_of_the_course: course.aims_of_the_course,
			learning_outcomes: course.learning_outcomes,
			course_contents: course.course_contents,
			special_requirements: course.special_requirements,
			guarantors: course.guarantors?.join('|') ?? null,
			last_modified_date: course.last_modified_date,
			last_modified_by: course.last_modified_by,
			study_load: course.study_load ? JSON.stringify(course.study_load) : null,
			literature_required: course.literature_required,
			literature_recommended: course.literature_recommended,
			last_scraped_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
			content_hash: course.content_hash
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id, ...updatePayload } = coursePayload

		await trx.insertInto(CourseTable._table).values(coursePayload).onDuplicateKeyUpdate(updatePayload).execute()

		await syncAssessmentMethods(trx, course.id, course.assessment_methods ?? [])
		await syncTimetable(trx, course.id, course.timetable ?? [])
	})

	// Study-plan linking runs outside the transaction to avoid deadlocks: concurrent jobs
	// holding course-write locks contend on InnoDB range locks when UPDATing study_plan_courses.
	// The unique index (idx_plan_courses_unique_lookup) reduces this to a single-row lock,
	// but keeping the step outside also ensures a missing study plan row (race with the study
	// plan scraper) never rolls back the entire course upsert.
	await syncStudyPlansFromCourse(course.id, course.ident ?? '', course.year)

	await redis.publish(
		`course:updated:${course.id}`,
		JSON.stringify({
			status: 'done',
			courseId: course.id,
			updatedAt: new Date().toISOString()
		})
	)

	await flushResponseCaches()

	LoggerJobContext.add({
		assessment_method_count: course.assessment_methods?.length ?? 0,
		timetable_unit_count: course.timetable?.length ?? 0,
		study_plan_link_count: course.study_plans?.length ?? 0
	})
}

/**
 * Reconciles assessment methods.
 */
async function syncAssessmentMethods(trx: Transaction<Database>, courseId: number, incomingMethods: ScraperInSISCourseAssessmentMethod[]): Promise<void> {
	await trx.deleteFrom(CourseAssessmentTable._table).where('course_id', '=', courseId).execute()

	const unique = [...new Map(incomingMethods.map(m => [m.method, m])).values()].map(m => ({
		course_id: courseId,
		method: m.method,
		weight: m.weight
	}))

	if (unique.length > 0) {
		await trx.insertInto(CourseAssessmentTable._table).values(unique).execute()
	}
}

/**
 * Reconciles timetable units.
 */
async function syncTimetable(trx: Transaction<Database>, courseId: number, incomingUnits: ScraperInSISCourseTimetableUnit[]): Promise<void> {
	// 1. Fetch existing unit IDs for this course
	const existingUnits = await trx.selectFrom(CourseUnitTable._table).select('id').where('course_id', '=', courseId).execute()

	const existingIds = existingUnits.map(u => u.id)

	// 2. Cleanup: Delete existing slots and units
	// We must delete slots first to respect Foreign Key constraints (unless ON DELETE CASCADE is set in DB)
	if (existingIds.length > 0) {
		await trx.deleteFrom(CourseUnitSlotTable._table).where('unit_id', 'in', existingIds).execute()

		await trx.deleteFrom(CourseUnitTable._table).where('id', 'in', existingIds).execute()
	}

	// 3. Recreate: Insert new units and their slots
	for (const incoming of incomingUnits) {
		const unitValues: NewCourseUnit = {
			course_id: courseId,
			lecturer: incoming.lecturer,
			capacity: incoming.capacity,
			note: incoming.note
		}
		const res = await trx.insertInto(CourseUnitTable._table).values(unitValues).executeTakeFirstOrThrow()

		const newUnitId = Number(res.insertId)

		// Insert slots for the new unit
		// We can reuse syncSlotsForUnit, or inline the insert if we want to save the "delete" query inside it
		await syncSlotsForUnit(trx, newUnitId, incoming.slots ?? [])
	}
}

async function syncSlotsForUnit(trx: Transaction<Database>, unitId: number, incomingSlots: ScraperInSISCourseTimetableSlot[]): Promise<void> {
	// We already deleted existing slots in the parent function

	if (incomingSlots.length > 0) {
		const slotRows: NewCourseUnitSlot[] = incomingSlots.map(slot => ({
			unit_id: unitId,
			type: slot.type,
			frequency: slot.frequency,
			date: slot.date,
			day: slot.day,
			time_from: timeToMinutes(slot.time_from),
			time_to: timeToMinutes(slot.time_to),
			location: slot.location
		}))

		await trx.insertInto(CourseUnitSlotTable._table).values(slotRows).execute()
	}
}

/**
 * Links this course to all study plan editions that list its ident.
 *
 * Reads from study_plans_course_idents (owned by the study plan scraper) to find
 * every plan edition that includes this course ident. For each, upserts into
 * study_plan_courses with "newer year wins" semantics: only overwrites an existing
 * course_id if the incoming course year is >= the year of the currently linked course.
 */
async function syncStudyPlansFromCourse(
	courseId: number,
	courseIdent: string,
	courseYear: number | null
): Promise<void> {
	const planEntries = await mysql
		.selectFrom(StudyPlanCourseIdentTable._table)
		.select(['study_plan_id', 'group', 'category'])
		.where('course_ident', '=', courseIdent)
		.execute()

	for (const entry of planEntries) {
		const existing = await mysql
			.selectFrom(`${StudyPlanCourseTable._table} as spc`)
			.innerJoin(`${CourseTable._table} as ec`, 'ec.id', 'spc.course_id')
			.select('ec.year')
			.where('spc.study_plan_id', '=', entry.study_plan_id)
			.where('spc.course_ident', '=', courseIdent)
			.executeTakeFirst()

		if (!existing) {
			await mysql
				.insertInto(StudyPlanCourseTable._table)
				.values({
					study_plan_id: entry.study_plan_id,
					course_id: courseId,
					course_ident: courseIdent,
					group: entry.group,
					category: entry.category
				})
				.execute()
		} else {
			const existingYear = existing.year as number | null
			if (courseYear !== null && (existingYear === null || courseYear >= existingYear)) {
				await mysql
					.updateTable(StudyPlanCourseTable._table)
					.set({ course_id: courseId })
					.where('study_plan_id', '=', entry.study_plan_id)
					.where('course_ident', '=', courseIdent)
					.execute()
			}
		}
	}
}

/**
 * Scans and deletes all response-cache and facet-cache keys so the next
 * request fetches fresh data from the DB after a course is updated.
 */
async function flushResponseCaches(): Promise<void> {
	for (const pattern of ['cache:*', 'course:facets:*']) {
		let cursor = '0'
		do {
			const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
			cursor = nextCursor
			if (keys.length > 0) {
				await redis.del(...keys)
			}
		} while (cursor !== '0')
	}
}
