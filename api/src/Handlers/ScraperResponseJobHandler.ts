import ScraperResponseJobInterface, { ScraperEventResponseJobInterface } from '@api/Interfaces/ScraperResponseJobInterface'
import ScraperEventResponseJob from '@api/Jobs/ScraperEventResponseJob'
import { Job } from 'bullmq'

export default async function ScraperResponseJobHandler(job: Job<ScraperResponseJobInterface>): Promise<void> {
    const type = job.data.type

    console.log(`Job of type ${type} with id ${job.id} started.`)

    switch (type) {
        // case 'Events':
        //     break
        case 'Event':
            await ScraperEventResponseJob(job as Job<ScraperEventResponseJobInterface>)
            break
        case 'EventRegister':
            // await EventRegisterScraperController(job.data)
            break
        default:
            console.warn(`Unknown job type: ${type}`)
            break
    }

    console.log(`Job of type ${type} with id ${job.id} completed.`)
}
