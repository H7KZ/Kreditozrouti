import { mysql } from '@api/clients'
import { CourseAssessmentMethodTable, CourseIdRedirectTable, CourseTable, CourseTimetableSlotTable, CourseTimetableUnitTable } from '@api/Database/types'
import { ScraperInSISCourseAssessmentMethod, ScraperInSISCourseTimetableSlot, ScraperInSISCourseTimetableUnit } from '@scraper/Interfaces/ScraperInSISCourse'
import { ScraperInSISCourseResponseJob } from '@scraper/Interfaces/ScraperResponseJob'

/**
 * Processes the scraper response for a specific InSIS course.
 * Upserts course details into the database and triggers synchronization for assessment methods and timetables.
 *
 * @param data - The scraper response job data containing course information.
 */
export default async function ScraperResponseInSISCourseJob(data: ScraperInSISCourseResponseJob): Promise<void> {
    const course = data.course

    if (!course?.id) {
        return
    }

    const courseId = course.id
    console.log(`Processing sync for course Id: ${courseId} (${course.ident})`)

    const coursePayload = {
        id: courseId,
        url: course.url,
        ident: course.ident ?? '',
        title: course.title,
        czech_title: course.czech_title,
        ects: course.ects,
        faculty: course.faculty,
        mode_of_delivery: course.mode_of_delivery,
        mode_of_completion: course.mode_of_completion,
        languages: course.languages ? course.languages.join('|') : null,
        level: course.level,
        year_of_study: course.year_of_study,
        semester: course.semester,
        lecturers: course.lecturers ? course.lecturers.join('|') : null,
        prerequisites: course.prerequisites,
        recommended_programmes: course.recommended_programmes,
        required_work_experience: course.required_work_experience,
        aims_of_the_course: course.aims_of_the_course,
        learning_outcomes: course.learning_outcomes,
        course_contents: course.course_contents,
        special_requirements: course.special_requirements,
        literature: course.literature
    }

    // 1. Upsert the Main Course Record
    await mysql
        .insertInto(CourseTable._table)
        .values(coursePayload)
        .onDuplicateKeyUpdate({
            ident: coursePayload.ident,
            title: coursePayload.title,
            czech_title: coursePayload.czech_title,
            ects: coursePayload.ects,
            faculty: coursePayload.faculty,
            mode_of_delivery: coursePayload.mode_of_delivery,
            mode_of_completion: coursePayload.mode_of_completion,
            languages: coursePayload.languages,
            level: coursePayload.level,
            year_of_study: coursePayload.year_of_study,
            semester: coursePayload.semester,
            lecturers: coursePayload.lecturers,
            prerequisites: coursePayload.prerequisites,
            recommended_programmes: coursePayload.recommended_programmes,
            required_work_experience: coursePayload.required_work_experience,
            aims_of_the_course: coursePayload.aims_of_the_course,
            learning_outcomes: coursePayload.learning_outcomes,
            course_contents: coursePayload.course_contents,
            special_requirements: coursePayload.special_requirements,
            literature: coursePayload.literature
        })
        .execute()

    // 2. Handle ID Redirects
    // If the ID in the URL is valid, different from the canonical ID, and we are sure it's not a parser error
    if (course.url_id && course.url_id !== courseId) {
        console.log(`Detected redirect: URL ID ${course.url_id} -> Course ID ${courseId}`)
        await mysql
            .insertInto(CourseIdRedirectTable._table)
            .values({
                course_id: courseId,
                old_id: course.url_id
            })
            // Use ignore to skip if this specific pair already exists (avoid duplicate key errors)
            .ignore()
            .execute()
    }

    // 3. Sync Child Tables
    await syncAssessmentMethods(courseId, course.assessment_methods ?? [])
    await syncTimetable(courseId, course.timetable ?? [])

    console.log(`Synced course Id: ${courseId}`)
}

/**
 * Reconciles assessment methods for a course.
 * Performs differential updates (insert, update weight, delete) based on the method name.
 */
async function syncAssessmentMethods(courseId: number, incomingMethods: ScraperInSISCourseAssessmentMethod[]): Promise<void> {
    const existingMethods = await mysql.selectFrom(CourseAssessmentMethodTable._table).selectAll().where('course_id', '=', courseId).execute()

    const incomingMap = new Map(incomingMethods.map(m => [m.method, m]))

    const toDeleteIds = existingMethods.filter(em => em.method && !incomingMap.has(em.method)).map(em => em.id)

    if (toDeleteIds.length > 0) {
        await mysql.deleteFrom(CourseAssessmentMethodTable._table).where('id', 'in', toDeleteIds).execute()
    }

    for (const existing of existingMethods) {
        const incoming = existing.method ? incomingMap.get(existing.method) : null
        if (incoming && existing.weight !== incoming.weight) {
            await mysql.updateTable(CourseAssessmentMethodTable._table).set({ weight: incoming.weight }).where('id', '=', existing.id).execute()
        }
    }

    const existingMethodNames = new Set(existingMethods.map(m => m.method))

    const toInsert = incomingMethods
        .filter(im => im.method && !existingMethodNames.has(im.method))
        .map(im => ({ course_id: courseId, method: im.method, weight: im.weight }))

    if (toInsert.length > 0) {
        await mysql.insertInto(CourseAssessmentMethodTable._table).values(toInsert).execute()
    }
}

/**
 * Synchronizes course timetable units.
 * Identifies units via property hashing to determine insertion or deletion requirements.
 */
async function syncTimetable(courseId: number, incomingUnits: ScraperInSISCourseTimetableUnit[]): Promise<void> {
    const existingUnits = await mysql
        .selectFrom(CourseTimetableUnitTable._table)
        .select(['id', 'lecturer', 'capacity', 'note'])
        .where('course_id', '=', courseId)
        .execute()

    const getUnitHash = (u: { lecturer: string | null; capacity: number | null; note: string | null }) =>
        `${u.lecturer ?? ''}|${u.capacity ?? 0}|${u.note ?? ''}`

    const existingMap = new Map(existingUnits.map(u => [getUnitHash(u), u]))
    const processedIds: number[] = []

    for (const incoming of incomingUnits) {
        const hash = getUnitHash(incoming)
        let unitId: number

        if (existingMap.has(hash)) {
            const match = existingMap.get(hash)!
            unitId = match.id
            processedIds.push(unitId)
        } else {
            const newUnit = {
                course_id: courseId,
                lecturer: incoming.lecturer,
                capacity: incoming.capacity,
                note: incoming.note
            }

            const res = await mysql.insertInto(CourseTimetableUnitTable._table).values(newUnit).executeTakeFirstOrThrow()
            unitId = Number(res.insertId)
        }

        await syncSlotsForUnit(unitId, incoming.slots ?? [])
    }

    const toDeleteIds = existingUnits.map(u => u.id).filter(id => !processedIds.includes(id))

    if (toDeleteIds.length > 0) {
        await mysql.deleteFrom(CourseTimetableUnitTable._table).where('id', 'in', toDeleteIds).execute()
    }
}

/**
 * Replaces all scheduling slots for a specific timetable unit.
 */
async function syncSlotsForUnit(unitId: number, incomingSlots: ScraperInSISCourseTimetableSlot[]): Promise<void> {
    await mysql.deleteFrom(CourseTimetableSlotTable._table).where('timetable_unit_id', '=', unitId).execute()

    if (incomingSlots.length > 0) {
        const slotRows = incomingSlots.map(slot => ({
            timetable_unit_id: unitId,
            type: slot.type,
            frequency: slot.frequency,
            date: slot.date,
            day: slot.day,
            time_from: slot.time_from,
            time_to: slot.time_to,
            time_from_minutes: timeToMinutes(slot.time_from),
            time_to_minutes: timeToMinutes(slot.time_to),
            location: slot.location
        }))

        await mysql.insertInto(CourseTimetableSlotTable._table).values(slotRows).execute()
    }
}

function timeToMinutes(time: string | null): number | null {
    if (!time?.includes(':')) {
        return null
    }

    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}
