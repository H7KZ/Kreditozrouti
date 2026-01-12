import { mysql } from '@api/clients';
import LoggerJobContext from '@api/Context/LoggerJobContext';
import { CourseIdRedirectTable, CourseTable, NewStudyPlanCourse, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types';
import { ScraperInSISStudyPlanResponseJob } from '@scraper/Interfaces/ScraperResponseJob';


/**
 * Syncs a scraped InSIS Study Plan into the database.
 *
 * This job performs the following operations:
 * 1. Resolves the Study Plan ID:
 * - If ID is known, uses it directly.
 * - If ID is unknown (-1), attempts to find the plan by metadata (ident, faculty, semester).
 * - If not found, creates a new plan.
 * 2. Manages Course Associations:
 * - Full Sync (Known ID): Wipes existing courses and re-inserts.
 * - Partial Sync (Unknown ID): Merges (Upserts) courses without deleting others.
 * 3. Resolves course IDs (handling redirects) and inserts course associations.
 */
export default async function ScraperResponseInSISStudyPlanJob(data: ScraperInSISStudyPlanResponseJob): Promise<void> {
    const { plan } = data

    if (!plan) return

    let studyPlanId = plan.id
    const isUnknownId = studyPlanId === -1

    if (isUnknownId) {
        // ID is unknown (scraped from course page). Try to find existing plan by metadata.
        // We require at least ident, faculty and semester to match reliably.
        if (plan.ident && plan.faculty && plan.semester) {
            const existingPlan = await mysql
                .selectFrom(StudyPlanTable._table)
                .select('id')
                .where(eb =>
                    eb.and([
                        eb('ident', '=', plan.ident),
                        eb('faculty', '=', plan.faculty),
                        eb('semester', '=', plan.semester),
                        // mode_of_study is often present but optional in strict matching if null?
                        // We include it if it exists to be precise.
                        plan.mode_of_study ? eb('mode_of_study', '=', plan.mode_of_study) : eb.val(true)
                    ])
                )
                .executeTakeFirst()

            if (existingPlan) {
                studyPlanId = existingPlan.id
            } else {
                // Not found, create a new one (auto-increment ID)
                const result = await mysql
                    .insertInto(StudyPlanTable._table)
                    .values({
                        url: plan.url,
                        ident: plan.ident,
                        title: plan.title,
                        faculty: plan.faculty,
                        semester: plan.semester,
                        level: plan.level,
                        mode_of_study: plan.mode_of_study,
                        study_length: plan.study_length
                    })
                    .executeTakeFirst()

                if (result.insertId) {
                    studyPlanId = Number(result.insertId)
                } else {
                    LoggerJobContext.add({ error: 'Failed to create new study plan for unknown ID' })
                    return
                }
            }
        } else {
            LoggerJobContext.add({ error: 'Missing metadata for unknown study plan ID', plan_ident: plan.ident })
            return
        }
    } else {
        // ID is known (Full scrape). Upsert with explicit ID.
        // We cast to any because NewStudyPlan type might omit 'id' if it's auto-generated,
        // but here we want to force the specific InSIS ID.
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

        await mysql
            .insertInto(StudyPlanTable._table)
            .values(planPayload as any)
            .onDuplicateKeyUpdate(planPayload as any)
            .execute()
    }

    LoggerJobContext.add({
        study_plan_id: studyPlanId,
        study_plan_ident: plan.ident,
        operation_mode: isUnknownId ? 'merge' : 'overwrite'
    })

    // Only wipe existing courses if we are doing a FULL sync (we have the authoritative ID and content)
    if (!isUnknownId) {
        await mysql.deleteFrom(StudyPlanCourseTable._table).where('study_plan_id', '=', studyPlanId).execute()
    }

    if (!plan.courses || plan.courses.length === 0) {
        return
    }

    // Resolve Real Course IDs (Map Scraped ID -> Real DB ID)
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

    // Deduplicate courses by ident to avoid insertion errors within the batch
    const uniqueCourses = new Map<string, (typeof plan.courses)[0]>()
    plan.courses.forEach(c => uniqueCourses.set(c.ident, c))

    const rowsToInsert: NewStudyPlanCourse[] = Array.from(uniqueCourses.values()).map(item => {
        let verifiedId: number | null = null

        if (item.id != null && validIdMap.has(item.id)) {
            verifiedId = validIdMap.get(item.id)!
        }

        return {
            study_plan_id: studyPlanId,
            course_ident: item.ident,
            course_id: verifiedId,
            group: item.group,
            category: item.category
        }
    })

    if (rowsToInsert.length > 0) {
        if (isUnknownId) {
            // MERGE MODE: Upsert specific courses without touching others
            await mysql
                .insertInto(StudyPlanCourseTable._table)
                .values(rowsToInsert)
                .onDuplicateKeyUpdate({
                    group: eb => eb.ref('values.group' as any),
                    category: eb => eb.ref('values.category' as any),
                    course_id: eb => eb.ref('values.course_id' as any)
                })
                .execute()
        } else {
            // OVERWRITE MODE: Simple insert (we already wiped the table for this plan)
            await mysql.insertInto(StudyPlanCourseTable._table).values(rowsToInsert).execute()
        }
    }

    LoggerJobContext.add({
        course_count: rowsToInsert.length
    })
}
