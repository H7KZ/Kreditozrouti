import { mysql } from '@api/clients'
import { CourseTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { ScraperInSISStudyPlanResponseJob } from '@scraper/Interfaces/ScraperResponseJob'

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

    const coursesToSync: { ident: string; category: string }[] = []

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

    for (const cat of categories) {
        if (cat.list && cat.list.length > 0) {
            for (const ident of cat.list) {
                coursesToSync.push({ ident, category: cat.name })
                allIdents.add(ident)
            }
        }
    }

    const courseIdMap = new Map<string, number>()

    if (allIdents.size > 0) {
        const foundCourses = await mysql
            .selectFrom(CourseTable._table)
            .select(['id', 'ident'])
            .where('ident', 'in', Array.from(allIdents))
            .where('semester', '=', plan.semester)
            .execute()

        for (const c of foundCourses) {
            courseIdMap.set(c.ident, c.id)
        }
    }

    await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', planId).execute()

    if (coursesToSync.length > 0) {
        const rowsToInsert = coursesToSync.map(item => ({
            study_plan_id: planId,
            course_ident: item.ident,
            course_id: courseIdMap.get(item.ident) ?? null,
            category: item.category
        }))

        await mysql
            .insertInto(StudyPlanCourseTable._table)
            .values(rowsToInsert as unknown as NewStudyPlanCourse)
            .execute()
    }

    console.log(`Synced study plan Id: ${planId}`)
}
