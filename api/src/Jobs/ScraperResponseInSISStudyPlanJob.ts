import { mysql } from '@api/clients'
import { CourseTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { ScraperInSISStudyPlanResponseJob } from '@scraper/Interfaces/ScraperResponseJob'
import { sql } from 'kysely'

/**
 * Processes the scraper response for a specific InSIS Study Plan.
 * Upserts study plan details into the database and synchronizes the associated course lists.
 *
 * @param data - The scraper response job data containing study plan information.
 */
export default async function ScraperResponseInSISStudyPlanJob(data: ScraperInSISStudyPlanResponseJob): Promise<void> {
    const plan = data.plan

    if (!plan?.id) {
        return
    }

    const planId = plan.id
    console.log(`Processing sync for study plan Id: ${planId} (${plan.ident})`)

    const planPayload = {
        id: planId,
        url: plan.url,
        ident: plan.ident,
        title: plan.title,
        faculty: plan.faculty,
        semester: plan.semester,
        level: plan.level,
        mode_of_study: plan.mode_of_study,
        study_length: plan.study_length
    }

    // Upsert the Study Plan details
    await mysql
        .insertInto(StudyPlanTable._table)
        .values(planPayload)
        .onDuplicateKeyUpdate({
            url: planPayload.url,
            ident: planPayload.ident,
            title: planPayload.title,
            faculty: planPayload.faculty,
            semester: planPayload.semester,
            level: planPayload.level,
            mode_of_study: planPayload.mode_of_study,
            study_length: planPayload.study_length
        })
        .execute()

    // Prepare Course List

    const coursesToSync: { id: number | null; ident: string; category: string }[] = []

    const categories = [
        { list: plan.compulsory_courses_idents, name: 'compulsory' },
        { list: plan.elective_courses_idents, name: 'elective' },
        { list: plan.physical_education_courses_idents, name: 'physical_education' },
        { list: plan.general_elective_courses_idents, name: 'general_elective' },
        { list: plan.state_exam_courses_idents, name: 'state_exam' },
        { list: plan.language_courses_idents, name: 'language' },
        { list: plan.optional_courses_idents, name: 'optional' }
    ]

    const allIdents = new Set<string>()
    const allIds = new Set<number>()

    for (const cat of categories) {
        if (!cat.list || cat.list.length === 0) continue

        for (const list of cat.list) {
            coursesToSync.push({ id: list.id, ident: list.ident, category: cat.name })
            allIdents.add(list.ident)

            if (list.id) allIds.add(list.id)
        }
    }

    // Resolve Course IDs (Find IDs for idents)

    const foundCoursesIds = new Set<number>()

    if (allIdents.size > 0) {
        const foundCourses = await mysql.selectFrom(CourseTable._table).select(['id', 'ident']).where('id', 'in', Array.from(allIds)).execute()

        for (const c of foundCourses) {
            foundCoursesIds.add(c.id)
        }
    }

    // 1. cleanup - delete courses that are in the DB but NO LONGER in the plan
    let deleteQuery = mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', planId)

    if (allIdents.size > 0) {
        deleteQuery = deleteQuery.where('course_ident', 'not in', Array.from(allIdents))
    }

    await deleteQuery.execute()

    // 2. insert new courses OR update existing ones (fixing course_id if it's found now)
    if (coursesToSync.length > 0) {
        const rowsToInsert = coursesToSync.map(item => ({
            study_plan_id: planId,
            course_ident: item.ident,
            course_id: foundCoursesIds.has(item.id!) ? item.id : null,
            category: item.category
        }))

        await mysql
            .insertInto(StudyPlanCourseTable._table)
            .values(rowsToInsert as unknown as NewStudyPlanCourse)
            .onDuplicateKeyUpdate({
                // We use SQL<> to forcibly cast the types to match the Table Definition
                course_id: sql<number | null>`VALUES(course_id)`,
                // We cast category to "any" or the specific union string to satisfy the strict union type
                category: sql<any>`VALUES(category)`
            })
            .execute()
    }

    console.log(`Synced study plan Id: ${planId}`)
}
