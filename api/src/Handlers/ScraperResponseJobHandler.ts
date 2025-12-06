import ScraperFISEventResponseJob from '@api/Jobs/ScraperFISEventResponseJob'
import ScraperInSISCourseResponseJob from '@api/Jobs/ScraperInSISCourseResponseJob'
import ScraperResponseJobInterface, {
    ScraperFISEventResponseJobInterface,
    ScraperInSISCourseResponseJobInterface
} from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Job } from 'bullmq'

export default async function ScraperResponseJobHandler(job: Job<ScraperResponseJobInterface>): Promise<void> {
    const type = job.data.type

    console.log(`Job of type ${type} with id ${job.id} started.`)

    const benchmark = performance.now()

    try {
        switch (type) {
            case '4FIS:Events':
                break
            case '4FIS:Event':
                await ScraperFISEventResponseJob(job as Job<ScraperFISEventResponseJobInterface>)
                break
            case 'InSIS:Catalog':
                break
            case 'InSIS:Course':
                await ScraperInSISCourseResponseJob(job as Job<ScraperInSISCourseResponseJobInterface>)
                break
            default:
                console.warn(`Unknown job type: ${type}`)
                break
        }

        console.log(`Job Id ${job.id} of type ${type} took ${(performance.now() - benchmark).toFixed(4)} ms to complete.`)
        console.log(`Job of type ${type} with id ${job.id} completed.`)
    } catch (error) {
        console.log(`Job Id ${job.id} of type ${type} failed after ${(performance.now() - benchmark).toFixed(4)} ms.`)
        console.error(`Job of type ${type} with id ${job.id} failed with error:`, error)
        throw error
    }
}
