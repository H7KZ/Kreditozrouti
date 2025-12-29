import { mysql } from '@api/clients'
import { CourseIdRedirectTable, CourseTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
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

    // 1. Upsert the Study Plan details
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

    // 2. Clear ALL existing courses for this plan
    // We wipe the slate clean to avoid duplicates since there is no unique constraint on the link table
    await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', planId).execute()

    if (!plan.courses || plan.courses.length === 0) {
        console.log(`Synced study plan Id: ${planId} (No courses found)`)
        return
    }

    // 3. Prepare Data for Lookup
    const incomingCourseIds = new Set<number>()

    for (const course of plan.courses) {
        if (course.id != null) {
            incomingCourseIds.add(course.id)
        }
    }

    // 4. Resolve Course IDs
    // We need to map: Scraped ID -> Real DB ID (Direct or Redirect)
    const validIdMap = new Map<number, number>() // Maps Scraped ID -> Real DB ID

    if (incomingCourseIds.size > 0) {
        // A. Direct Match Query
        const directMatches = await mysql.selectFrom(CourseTable._table).select('id').where('id', 'in', Array.from(incomingCourseIds)).execute()

        // Process Direct Matches
        for (const c of directMatches) {
            validIdMap.set(Number(c.id), Number(c.id))
        }

        // B. Redirect Match Query (old_id -> course_id)
        const redirectMatches = await mysql
            .selectFrom(CourseIdRedirectTable._table)
            .select(['course_id', 'old_id'])
            .where('old_id', 'in', Array.from(incomingCourseIds))
            .execute()

        for (const r of redirectMatches) {
            validIdMap.set(Number(r.old_id), Number(r.course_id))
        }
    }

    // 5. Insert New Courses
    const uniqueCourses = new Map<string, (typeof plan.courses)[0]>()
    for (const c of plan.courses) {
        uniqueCourses.set(c.ident, c)
    }

    const rowsToInsert: NewStudyPlanCourse[] = Array.from(uniqueCourses.values()).map(item => {
        let verifiedId: number | null = null

        // Priority 1: Check ID Map (Handles Direct Match AND Redirects)
        if (item.id != null && validIdMap.has(Number(item.id))) {
            verifiedId = validIdMap.get(Number(item.id))!
        }

        return {
            study_plan_id: planId,
            course_ident: item.ident,
            course_id: verifiedId,
            category: item.category
        }
    })

    if (rowsToInsert.length > 0) {
        await mysql.insertInto(StudyPlanCourseTable._table).values(rowsToInsert).execute()
    }

    console.log(`Synced study plan Id: ${planId} with ${rowsToInsert.length} courses`)
}
