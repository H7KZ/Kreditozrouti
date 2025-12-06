import { mysql } from '@api/clients'
import {
    CourseAssessmentMethodTableName,
    CourseTableName,
    CourseTimetableSlotTableName,
    CourseTimetableUnitTableName,
    NewCourseAssessmentMethod,
    NewCourseTimetableSlot,
    NewCourseTimetableUnit
} from '@api/Database/types'
import { ScraperInSISCourseResponseJobInterface } from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { AssessmentMethod, TimetableSlot, TimetableUnit } from '@scraper/Interfaces/InSIS/InSISCourseInterface'
import { Job } from 'bullmq'

export default async function ScraperInSISCourseResponseJob(job: Job<ScraperInSISCourseResponseJobInterface>): Promise<void> {
    const data = job.data.course

    if (!data?.id) {
        console.warn(`No valid course data found for job Id: ${job.id}`)
        return
    }

    const courseId = data.id
    console.log(`Processing sync for course Id: ${courseId} (${data.ident})`)

    const coursePayload = {
        id: courseId,
        url: data.url,
        ident: data.ident ?? '',
        title: data.title,
        czech_title: data.czech_title,
        ects: data.ects,
        mode_of_delivery: data.mode_of_delivery,
        mode_of_completion: data.mode_of_completion,
        languages: data.languages ? data.languages.join('|') : null,
        level: data.level,
        year_of_study: data.year_of_study,
        semester: data.semester,
        lecturers: data.lecturers ? data.lecturers.join('|') : null,
        prerequisites: data.prerequisites,
        recommended_programmes: data.recommended_programmes,
        required_work_experience: data.required_work_experience,
        aims_of_the_course: data.aims_of_the_course,
        learning_outcomes: data.learning_outcomes,
        course_contents: data.course_contents,
        special_requirements: data.special_requirements,
        literature: data.literature
    }

    await mysql
        .insertInto(CourseTableName)
        .values(coursePayload)
        .onDuplicateKeyUpdate({
            ident: coursePayload.ident,
            title: coursePayload.title,
            czech_title: coursePayload.czech_title,
            ects: coursePayload.ects,
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

    await syncAssessmentMethods(courseId, data.assessment_methods ?? [])
    await syncTimetable(courseId, data.timetable ?? [])

    console.log(`Synced course Id: ${courseId}`)
}

/**
 * Syncs assessment methods (Insert New, Update Changed, Delete Missing).
 */
async function syncAssessmentMethods(courseId: number, incomingMethods: AssessmentMethod[]): Promise<void> {
    const existingMethods = await mysql.selectFrom(CourseAssessmentMethodTableName).selectAll().where('course_id', '=', courseId).execute()

    const incomingMap = new Map(incomingMethods.map(m => [m.method, m]))

    const toDeleteIds = existingMethods.filter(em => em.method && !incomingMap.has(em.method)).map(em => em.id)

    if (toDeleteIds.length > 0) {
        await mysql.deleteFrom(CourseAssessmentMethodTableName).where('id', 'in', toDeleteIds).execute()
    }

    for (const existing of existingMethods) {
        const incoming = existing.method ? incomingMap.get(existing.method) : null
        if (incoming && existing.weight !== incoming.weight) {
            await mysql.updateTable(CourseAssessmentMethodTableName).set({ weight: incoming.weight }).where('id', '=', existing.id).execute()
        }
    }

    const existingMethodNames = new Set(existingMethods.map(m => m.method))

    const toInsert = incomingMethods
        .filter(im => im.method && !existingMethodNames.has(im.method))
        .map(
            im =>
                ({
                    course_id: courseId,
                    method: im.method,
                    weight: im.weight
                }) as NewCourseAssessmentMethod
        )

    if (toInsert.length > 0) {
        await mysql.insertInto(CourseAssessmentMethodTableName).values(toInsert).execute()
    }
}

/**
 * Syncs Timetable Units and their slots.
 */
async function syncTimetable(courseId: number, incomingUnits: TimetableUnit[]): Promise<void> {
    const existingUnits = await mysql
        .selectFrom(CourseTimetableUnitTableName)
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
            const newUnit: NewCourseTimetableUnit = {
                course_id: courseId,
                lecturer: incoming.lecturer,
                capacity: incoming.capacity,
                note: incoming.note
            }
            const res = await mysql.insertInto(CourseTimetableUnitTableName).values(newUnit).executeTakeFirstOrThrow()
            unitId = Number(res.insertId)
        }

        await syncSlotsForUnit(unitId, incoming.slots ?? [])
    }

    const toDeleteIds = existingUnits.map(u => u.id).filter(id => !processedIds.includes(id))

    if (toDeleteIds.length > 0) {
        await mysql.deleteFrom(CourseTimetableUnitTableName).where('id', 'in', toDeleteIds).execute()
    }
}

async function syncSlotsForUnit(unitId: number, incomingSlots: TimetableSlot[]): Promise<void> {
    await mysql.deleteFrom(CourseTimetableSlotTableName).where('timetable_unit_id', '=', unitId).execute()

    if (incomingSlots.length > 0) {
        const slotRows = incomingSlots.map(
            slot =>
                ({
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
                }) as NewCourseTimetableSlot
        )

        await mysql.insertInto(CourseTimetableSlotTableName).values(slotRows).execute()
    }
}

function timeToMinutes(time: string | null): number | null {
    if (!time?.includes(':')) {
        return null
    }

    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}
