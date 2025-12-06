import { JobEnum } from '@api/Enums/JobEnum'
import { scraper } from '@scraper/bullmq'
import { ScraperFISEventRequestJobInterface } from '@scraper/Interfaces/BullMQ/ScraperRequestJobInterface'
import ExtractFISService from '@scraper/Services/ExtractFISService'
import Axios from 'axios'

/**
 * Scrapes details for a specific FIS event.
 * Fetches the HTML page, parses event data, and dispatches a response job.
 *
 * @param data - The job payload containing the Event ID to scrape.
 * @returns A promise that resolves when the scrape response is queued.
 */
export default async function FISEventController(data: ScraperFISEventRequestJobInterface): Promise<void> {
    const request = await Axios.get<string>(`https://4fis.cz/${data.eventId}`, {
        headers: {
            'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
        }
    })

    const event = ExtractFISService.extractFISEventDetailsWithParser(request.data)

    await scraper.queue.response.add(JobEnum.FIS_EVENT_RESPONSE, { type: '4FIS:Event', event })
}
