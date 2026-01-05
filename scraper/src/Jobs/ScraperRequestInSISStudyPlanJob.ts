import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { ScraperInSISStudyPlanRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import UtilService from '@scraper/Services/UtilService'
import Axios from 'axios'

export default async function ScraperRequestInSISStudyPlanJob(data: ScraperInSISStudyPlanRequestJob): Promise<void | null> {
    const planId = ExtractInSISService.extractStudyPlanIdFromURL(data.url)

    LoggerJobContext.add({
        plan_id: planId,
        request_url: data.url
    })

    try {
        const response = await Axios.get<string>(data.url, {
            headers: ExtractInSISService.baseRequestHeaders()
        })

        const plan = ExtractInSISService.extractStudyPlan(response.data, data.url)

        await scraper.queue.response.add('InSIS Study Plan Response', { type: 'InSIS:StudyPlan', plan })

        if (plan.courses?.length && data.auto_queue_courses) {
            LoggerJobContext.add({
                queued_courses_count: plan.courses.length
            })

            await UtilService.runWithConcurrency(plan.courses, 20, async course => {
                if (!course.url) return
                await scraper.queue.request.add(
                    'InSIS Course Request (Study Plan)',
                    {
                        type: 'InSIS:Course',
                        url: course.url,
                        meta: {
                            faculty: { id: null, name: plan.faculty?.toLowerCase() ?? null },
                            period: { id: null, name: plan.semester?.toUpperCase() ?? null }
                        }
                    },
                    { deduplication: { id: `InSIS:Course:${ExtractInSISService.extractCourseIdFromURL(course.url)}` } }
                )
            })
        }
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            LoggerJobContext.add({
                response_status: error.response?.status ?? null,
                response_status_text: error.response?.statusText ?? null
            })
        } else {
            LoggerJobContext.add({
                error: (error as Error).message
            })
        }

        return null
    }
}
