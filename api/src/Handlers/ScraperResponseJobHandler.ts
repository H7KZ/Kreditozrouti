import { Job } from 'bullmq'
import ScraperResponseJobInterface from '@/Interfaces/ScraperResponseJobInterface'

export default async function ScraperResponseJobHandler(job: Job<ScraperResponseJobInterface>): Promise<void> {
    const jobType = job.data.type

    console.log(`New job of type ${jobType} with id ${job.id} added to the queue.`)
    console.log(`Job data: ${JSON.stringify(job.data)}`)

    // TODO: logic

    return Promise.resolve()
}
