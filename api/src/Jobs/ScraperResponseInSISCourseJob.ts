import type {
	ScraperInSISCourseAssessmentMethod,
	ScraperInSISCourseStudyPlan,
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
	StudyPlanCourseTable,
	StudyPlanTable
} from '@api/Database/types'

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

	let facultyId: string | null = null
	if (course.faculty?.ident) {
		facultyId = course.faculty.ident
		await mysql
			.insertInto('insis_faculties')
			.ignore()
			.values({ id: facultyId, title: course.faculty.title ?? null, is_schedule_publicly_visible: false })
			.execute()
		if (course.faculty.title) {
			await mysql.updateTable('insis_faculties').set({ title: course.faculty.title }).where('id', '=', facultyId).where('title', 'is', null).execute()
		}
	}

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

	if (course.study_plans && course.study_plans.length > 0) {
		const uniqueFacultyIdents = [...new Set(course.study_plans.map(p => p.facultyIdent).filter((id): id is string => !!id))]
		for (const ident of uniqueFacultyIdents) {
			await mysql.insertInto('insis_faculties').ignore().values({ id: ident, title: null, is_schedule_publicly_visible: false }).execute()
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

	// Study-plan linking runs outside the transaction so a missing study plan row
	// (race with the study plan scraper) doesn't roll back the entire course upsert.
	if (course.study_plans && course.study_plans.length > 0) {
		await syncStudyPlansFromCourse(course.id, course.ident ?? '', course.study_plans)
	}

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
	const existingMethods = await trx.selectFrom(CourseAssessmentTable._table).selectAll().where('course_id', '=', courseId).execute()

	// 1. Deduplicate incoming methods using a Map
	const incomingMap = new Map(incomingMethods.map(m => [m.method, m]))
	const existingMap = new Map(existingMethods.map(m => [m.method, m]))

	// Delete removed
	// (Iterate existing methods; if not found in incoming unique map, delete it)
	const toDeleteIds = existingMethods.filter(em => em.method && !incomingMap.has(em.method)).map(em => em.id)
	if (toDeleteIds.length > 0) {
		await trx.deleteFrom(CourseAssessmentTable._table).where('id', 'in', toDeleteIds).execute()
	}

	// Update weights
	for (const existing of existingMethods) {
		const incoming = existing.method ? incomingMap.get(existing.method) : null
		if (incoming && existing.weight !== incoming.weight) {
			await trx.updateTable(CourseAssessmentTable._table).set({ weight: incoming.weight }).where('id', '=', existing.id).execute()
		}
	}

	// Insert new
	const toInsert = Array.from(incomingMap.values())
		.filter(im => im.method && !existingMap.has(im.method))
		.map(im => ({
			course_id: courseId,
			method: im.method,
			weight: im.weight
		}))

	if (toInsert.length > 0) {
		await trx.insertInto(CourseAssessmentTable._table).values(toInsert).execute()
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
 * Links this course to Study Plans found on the course page.
 */
async function syncStudyPlansFromCourse(courseId: number, courseIdent: string, plans: ScraperInSISCourseStudyPlan[]): Promise<void> {
	for (const plan of plans) {
		const studyPlan = await mysql
			.selectFrom(StudyPlanTable._table)
			.select('id')
			.where(eb =>
				eb.and([
					eb('ident', '=', plan.ident),
					plan.facultyIdent ? eb('faculty_id', '=', plan.facultyIdent) : eb.val(true),
					eb('semester', '=', plan.semester),
					eb('year', '=', plan.year)
				])
			)
			.executeTakeFirst()

		if (!studyPlan) continue

		await mysql
			.updateTable(StudyPlanCourseTable._table)
			.set({ course_id: courseId })
			.where('study_plan_id', '=', studyPlan.id)
			.where('course_ident', '=', courseIdent)
			.where('group', '=', plan.group)
			.where('category', '=', plan.category)
			.execute()
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
