import ScraperRequestJobInterface from '@api/Interfaces/ScraperRequestJobInterface'
import { Job } from 'bullmq'

export default async function ScraperRequestJobHandler(job: Job<ScraperRequestJobInterface>): Promise<void> {
    const jobType = job.data.type

    console.log(`New job of type ${jobType} with id ${job.id} added to the queue.`)
    console.log(`Job data: ${JSON.stringify(job.data)}`)

    // TODO: logic

    return Promise.resolve()
}
