import ScraperEventResponseJob from '@api/Jobs/ScraperEventResponseJob'
import ScraperResponseJobInterface, { ScraperFISEventResponseJobInterface } from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Job } from 'bullmq'

export default async function ScraperResponseJobHandler(job: Job<ScraperResponseJobInterface>): Promise<void> {
    const type = job.data.type

    console.log(`Job of type ${type} with id ${job.id} started.`)

    switch (type) {
        // case '4FIS:Events':
        //     break
        case '4FIS:Event':
            await ScraperEventResponseJob(job as Job<ScraperFISEventResponseJobInterface>)
            break
        default:
            console.warn(`Unknown job type: ${type}`)
            break
    }

    console.log(`Job of type ${type} with id ${job.id} completed.`)
}
