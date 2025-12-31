import { mysql } from '@api/clients'
import { CourseIdRedirectTable, CourseTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { ScraperInSISStudyPlanResponseJob } from '@scraper/Interfaces/ScraperResponseJob'

/**
 * Syncs a scraped InSIS Study Plan into the database.
 *
 * This job performs the following operations:
 * 1. Upserts the study plan details.
 * 2. Wipes existing course associations for the plan.
 * 3. Resolves course IDs (handling redirects) and re-inserts course associations.
 */
export default async function ScraperResponseInSISStudyPlanJob(data: ScraperInSISStudyPlanResponseJob): Promise<void> {
    const { plan } = data

    if (!plan?.id) {
        return
    }

    console.log(`Processing sync for study plan Id: ${plan.id} (${plan.ident})`)

    const planPayload = {
        id: plan.id,
        url: plan.url,
        ident: plan.ident,
        title: plan.title,
        faculty: plan.faculty,
        semester: plan.semester,
        level: plan.level,
        mode_of_study: plan.mode_of_study,
        study_length: plan.study_length
    }

    await mysql.insertInto(StudyPlanTable._table).values(planPayload).onDuplicateKeyUpdate(planPayload).execute()

    // Wipe existing courses to ensure a clean sync (no unique constraint on link table)
    await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', plan.id).execute()

    if (!plan.courses || plan.courses.length === 0) {
        console.log(`Synced study plan Id: ${plan.id} (No courses found)`)
        return
    }

    // Resolve Real Course IDs (Map Scraped ID -> Real DB ID)
    // This handles cases where the scraped course ID might be an old ID pointing to a redirect.
    const incomingCourseIds = plan.courses.map(c => c.id).filter((id): id is number => id != null)

    const validIdMap = new Map<number, number>()

    if (incomingCourseIds.length > 0) {
        // 1. Direct Matches
        const directMatches = await mysql.selectFrom(CourseTable._table).select('id').where('id', 'in', incomingCourseIds).execute()

        directMatches.forEach(c => validIdMap.set(c.id, c.id))

        // 2. Redirect Matches (Old ID -> New Course ID)
        const redirectMatches = await mysql
            .selectFrom(CourseIdRedirectTable._table)
            .select(['course_id', 'old_id'])
            .where('old_id', 'in', incomingCourseIds)
            .execute()

        redirectMatches.forEach(r => validIdMap.set(r.old_id, r.course_id))
    }

    // Deduplicate courses by ident to avoid insertion errors
    const uniqueCourses = new Map<string, (typeof plan.courses)[0]>()
    plan.courses.forEach(c => uniqueCourses.set(c.ident, c))

    const rowsToInsert: NewStudyPlanCourse[] = Array.from(uniqueCourses.values()).map(item => {
        let verifiedId: number | null = null

        if (item.id != null && validIdMap.has(item.id)) {
            verifiedId = validIdMap.get(item.id)!
        }

        return {
            study_plan_id: plan.id,
            course_ident: item.ident,
            course_id: verifiedId,
            category: item.category
        }
    })

    if (rowsToInsert.length > 0) {
        await mysql.insertInto(StudyPlanCourseTable._table).values(rowsToInsert).execute()
    }

    console.log(`Synced study plan Id: ${plan.id} with ${rowsToInsert.length} courses`)
}
